// app.js — blueprint nodes viewer with SCIM JSON support (manual file load)

// ---------- helpers ----------
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];
function showToast(msg, ms=2200){ const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),ms); }
function brighten(hex,f){ const c=hex.replace('#',''); const r=parseInt(c.slice(0,2),16), g=parseInt(c.slice(2,4),16), b=parseInt(c.slice(4,6),16);
  const adj=v=>Math.max(0,Math.min(255,Math.round(v*f))); const out=(adj(r)<<16)|(adj(g)<<8)|adj(b); return `#${out.toString(16).padStart(6,'0')}`; }
function hexToP5Color(hex){ const c=hex.replace('#',''); return window.color(parseInt(c.slice(0,2),16),parseInt(c.slice(2,4),16),parseInt(c.slice(4,6),16)); }
function askRedraw(){ if(typeof window.redraw==="function") window.redraw(); }

// ---------- palette ----------
const TYPE_BASE = {
  "Iron Ore":"#8aa0b2","Copper Ore":"#f2a65a","Limestone":"#c9d1a0","Coal":"#282828",
  "Caterium Ore":"#e6d957","Raw Quartz":"#e9b0ff","Bauxite":"#b45a30","Sulfur":"#f0ea38",
  "Uranium":"#75ff57","S.A.M.":"#54e1ff","Crude Oil":"#7a4bff","Water":"#4ea3ff",
  "Nitrogen Gas":"#88c7ff","Geyser":"#ff9f9f","Unknown":"#bbbbbb"
};
const PURITY_MULT = { Impure:0.7, Normal:1.0, Pure:1.35 };

// ---------- world bounds (SCIM/wiki in cm) ----------
const WORLD_BOUNDS = {
  minX: -324600, // -3246 m
  minY: -375000, // -3750 m
  maxX:  425300, //  4253 m
  maxY:  375000  //  3750 m
};

// ---------- grid settings ----------
const GRID = {
  cols: 100,       // number of vertical strips in world
  rows: 100,       // number of horizontal strips in world
  majorEvery: 10,  // every N strips is a major intersection
  minorDotPx: 2.2,
  majorDotPx: 3.4
};

// ---------- state ----------
let nodes = []; // {type,purity,x,y,z}
let bbox = null;
let cam = { cx:(WORLD_BOUNDS.minX+WORLD_BOUNDS.maxX)/2, cy:(WORLD_BOUNDS.minY+WORLD_BOUNDS.maxY)/2, scale:0.0015 };
let activeTypes = new Set();
let activePurities = new Set(["Impure","Normal","Pure"]);
let hoverIdx = -1;

// ---------- UI builders ----------
const $filters = $("#filters");
const $legend  = $("#legendContent");

function rebuildUIFromData(list){
  const types = [...new Set(list.map(n=>n.type||"Unknown"))].sort();
  activeTypes = new Set(types);
  $filters.innerHTML = "";
  $legend.innerHTML  = "";

  for(const t of types){
    const id = `type-${t.replace(/\W+/g,'_')}`;
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" id="${id}" checked> ${t}`;
    $filters.appendChild(label);
    label.querySelector('input').addEventListener('change', e=>{
      if(e.target.checked) activeTypes.add(t); else activeTypes.delete(t);
      askRedraw();
    });

    const row = document.createElement('div'); row.className='item';
    const dot = document.createElement('span'); dot.className='dot';
    dot.style.background = TYPE_BASE[t] || TYPE_BASE["Unknown"];
    row.appendChild(dot);
    const span = document.createElement('span'); span.textContent = t;
    row.appendChild(span);
    $legend.appendChild(row);
  }
}

// ---------- geometry ----------
function computeBBox(list){
  if(!list.length) return null;
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const n of list){ const x=+n.x,y=+n.y; if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
  return {minX,maxX,minY,maxY};
}
function fitToView(){
  if(!bbox) return;
  const w=window.innerWidth,h=window.innerHeight, m=60;
  const sx=(w-m*2)/Math.max(1,bbox.maxX-bbox.minX);
  const sy=(h-m*2)/Math.max(1,bbox.maxY-bbox.minY);
  cam.scale = Math.min(sx,sy);
  cam.cx = (bbox.minX+bbox.maxX)/2;
  cam.cy = (bbox.minY+bbox.maxY)/2;
}

// ---------- SCIM parsing ----------
function normalizePurity(p) {
  if (!p) return "Normal";
  const s = (""+p).toLowerCase();
  if (s.includes("impure")) return "Impure";
  if (s.includes("pure") && !s.includes("im")) return "Pure";
  return "Normal";
}
function parseSCIMJson(obj){
  const out = [];
  if (!obj || !Array.isArray(obj.options)) return out;
  const tab = obj.options.find(o => o && (o.tabId === "resource_nodes" || /resource\s*nodes/i.test(o.name)));
  if (!tab || !Array.isArray(tab.options)) return out;
  for (const res of tab.options) {
    const friendlyType = res?.name || "Unknown";
    const purityLayers = res?.options || [];
    for (const layer of purityLayers) {
      const purity = normalizePurity(layer?.purity || layer?.name);
      const markers = layer?.markers || [];
      for (const m of markers) {
        const x = Number(m?.x), y = Number(m?.y), z = Number(m?.z ?? 0);
        if (Number.isFinite(x) && Number.isFinite(y)) {
          out.push({ type: friendlyType, purity, x, y, z });
        }
      }
    }
  }
  return out;
}

// ---------- dataset loading (file picker) ----------
async function parseFile(file){
  const text = await file.text();
  if (file.name.toLowerCase().endsWith('.csv')) {
    // CSV (header: type,purity,x,y,z)
    const lines = text.split(/\r?\n/).filter(Boolean);
    const header = lines.shift().split(',').map(s=>s.trim().toLowerCase());
    const idx = (k)=> header.indexOf(k);
    const out = [];
    for (const line of lines){
      const cols = line.split(',').map(s=>s.trim());
      out.push({
        type:   cols[idx('type')]   || 'Unknown',
        purity: cols[idx('purity')] || 'Normal',
        x: parseFloat(cols[idx('x')]),
        y: parseFloat(cols[idx('y')]),
        z: parseFloat(cols[idx('z')]||'0')
      });
    }
    return out.filter(n=>Number.isFinite(n.x)&&Number.isFinite(n.y));
  } else {
    // JSON: either our simple array OR SCIM big JSON
    const obj = JSON.parse(text);
    if (Array.isArray(obj)) {
      return obj.filter(n=>Number.isFinite(+n.x)&&Number.isFinite(+n.y)).map(n=>({
        type: n.type || "Unknown",
        purity: normalizePurity(n.purity),
        x:+n.x, y:+n.y, z:+(n.z??0)
      }));
    }
    const fromSCIM = parseSCIMJson(obj);
    if (fromSCIM.length) return fromSCIM;
    return [];
  }
}
$("#file").addEventListener('change', async (e)=>{
  const f = e.target.files?.[0]; if(!f) return;
  try{
    const list = await parseFile(f);
    if (!list.length){ showToast("No rows parsed (check schema)"); return; }
    nodes = list.map(n=>({
      type: n.type || "Unknown",
      purity: normalizePurity(n.purity),
      x:+n.x, y:+n.y, z:+(n.z??0)
    }));
    bbox = computeBBox(nodes);
    rebuildUIFromData(nodes);
    $("#count").textContent = `${nodes.length} nodes`;
    fitToView(); askRedraw();
    showToast(`Loaded ${nodes.length} nodes`);
  } catch(err){
    console.error(err);
    showToast("Failed to load dataset (see console).");
  }
});

// purity & controls
$$('#purityFilters input[type="checkbox"]').forEach(cb=>{
  cb.addEventListener('change', e=>{
    const p = e.target.dataset.purity;
    if(e.target.checked) activePurities.add(p); else activePurities.delete(p);
    askRedraw();
  });
});
$("#fit").addEventListener('click', ()=>{ fitToView(); askRedraw(); });
$("#labels").addEventListener('change', ()=> askRedraw());

// exports
function filteredNodes(){ return nodes.filter(n=>activeTypes.has(n.type) && activePurities.has(n.purity)); }
function download(name, text, type='text/plain'){
  const blob = new Blob([text], {type}); const url = URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}
$("#exportCsv").addEventListener('click', ()=>{
  const list = filteredNodes();
  const csv = ["type,purity,x,y,z", ...list.map(n=>`${n.type},${n.purity},${n.x},${n.y},${n.z}`)].join("\n");
  download("nodes.filtered.csv", csv, "text/csv");
});
$("#exportGeo").addEventListener('click', ()=>{
  const list = filteredNodes();
  const gj = { type:"FeatureCollection", features: list.map(n=>({ type:"Feature", geometry:{ type:"Point", coordinates:[n.x,n.y,n.z] }, properties:{ type:n.type, purity:n.purity } })) };
  download("nodes.filtered.geojson", JSON.stringify(gj,null,2), "application/geo+json");
});
$("#exportClean").addEventListener('click', ()=>{
  if (!nodes.length) { showToast("Nothing to export—load data first."); return; }
  const clean = nodes.map(n=>({ type:n.type, purity:n.purity, x:n.x, y:n.y, z:n.z }));
  download("nodes.json", JSON.stringify(clean, null, 2), "application/json");
});

// ---------- p5 sketch ----------
let dragging=false, dragStart=null, camStart=null;

window.setup = function(){
  window.createCanvas(window.innerWidth, window.innerHeight);
  window.noLoop();

  window.addEventListener('wheel', e=>{ cam.scale *= (Math.sign(e.deltaY) > 0 ? 0.9 : 1.1); askRedraw(); }, {passive:true});
  window.addEventListener('pointerdown', e=>{ dragging=true; dragStart={x:e.clientX,y:e.clientY}; camStart={...cam}; });
  window.addEventListener('pointermove', e=>{
    const tt=$("#tooltip");
    if(dragging){
      const dx=(e.clientX-dragStart.x)/cam.scale, dy=(e.clientY-dragStart.y)/cam.scale;
      cam.cx = camStart.cx - dx; cam.cy = camStart.cy - dy; askRedraw();
    } else {
      const world = screenToWorld(e.clientX, e.clientY);
      hoverIdx = pick(world.x, world.y);
      if(hoverIdx>=0){
        const n = nodes[hoverIdx];
        tt.style.display='block';
        tt.style.left = (e.clientX+12)+'px';
        tt.style.top  = (e.clientY+12)+'px';
        tt.innerHTML = `<strong>${n.type}</strong> (${n.purity})<br/>x:${n.x.toFixed(1)} y:${n.y.toFixed(1)} z:${n.z.toFixed(1)}`;
      } else tt.style.display='none';
    }
  });
  window.addEventListener('pointerup', ()=> dragging=false);
  window.addEventListener('resize', ()=>{ window.resizeCanvas(window.innerWidth, window.innerHeight); askRedraw(); });
};

function screenToWorld(sx,sy){ return { x:(sx - window.width/2)/cam.scale + cam.cx, y:(sy - window.height/2)/cam.scale + cam.cy }; }
function pick(wx,wy){
  if(!nodes.length) return -1;
  const r = 8/Math.sqrt(cam.scale);
  let best=-1, bestD=r*r;
  for(let i=0;i<nodes.length;i++){
    const n=nodes[i];
    if(!activeTypes.has(n.type) || !activePurities.has(n.purity)) continue;
    const dx=wx-n.x, dy=wy-n.y, d=dx*dx+dy*dy;
    if(d<=bestD){ best=i; bestD=d; }
  }
  return best;
}

window.draw = function(){
  window.background(10,16,32);
  drawBlueprintDots();

  if(!nodes.length) return;

  window.translate(window.width/2, window.height/2);
  window.scale(cam.scale, cam.scale);
  window.translate(-cam.cx, -cam.cy);

  // draw nodes — constant pixel size symbols
  for (const n of nodes) {
    if (!activeTypes.has(n.type) || !activePurities.has(n.purity)) continue;

    const base = TYPE_BASE[n.type] || TYPE_BASE["Unknown"];
    window.fill(hexToP5Color(brighten(base, PURITY_MULT[n.purity] || 1)));

    const screenSizePx = 10;  // tweak 8–12
    const sizeWorld = screenSizePx / Math.max(1e-6, cam.scale);

    if (n.type === "Geyser") {
      window.push(); window.translate(n.x, n.y); window.beginShape();
      window.vertex(0, -sizeWorld * 0.9);
      window.vertex(sizeWorld * 1.0, sizeWorld * 0.9);
      window.vertex(-sizeWorld * 1.0, sizeWorld * 0.9);
      window.endShape(window.CLOSE); window.pop();
    } else if (/Oil|Water|Gas/i.test(n.type)) {
      window.push(); window.translate(n.x, n.y); window.beginShape();
      window.vertex(0, -sizeWorld);
      window.vertex(sizeWorld, 0);
      window.vertex(0, sizeWorld);
      window.vertex(-sizeWorld, 0);
      window.endShape(window.CLOSE); window.pop();
    } else {
      window.circle(n.x, n.y, sizeWorld * 1.4);
    }

    if ($("#labels").checked) {
      const labelSizePx = 13;
      const labelSizeWorld = labelSizePx / Math.max(1e-6, cam.scale);
      window.textSize(labelSizeWorld);
      window.fill(210, 230, 255, 235);
      window.text(`${n.type} (${n.purity})`, n.x + sizeWorld * 1.6, n.y - sizeWorld * 0.8);
    }
  }
};

/* --- dotted blueprint grid
     majors = fixed world lattice
     minors = 1..4 subdivisions (earlier thresholds)
     minors are strictly interior (no minors on major rows/cols)
     plus perf-friendly distance thinning
--- */
function drawBlueprintDots(){
  const WB = WORLD_BOUNDS;

  // Base strip spacing (fixed in world units)
  const stepX = (WB.maxX - WB.minX) / Math.max(1, GRID.cols);
  const stepY = (WB.maxY - WB.minY) / Math.max(1, GRID.rows);

  // Major lattice step (every N strips)
  const majorStepX = stepX * Math.max(1, GRID.majorEvery);
  const majorStepY = stepY * Math.max(1, GRID.majorEvery);

  // Major cell size in screen px
  const majorCellPx = Math.min(majorStepX * cam.scale, majorStepY * cam.scale);

  // Earlier thresholds for subdivisions
  const SUBDIV_THRESH = { s2: 60, s3: 90, s4: 120 }; // px
  let S = 1;
  if (majorCellPx >= SUBDIV_THRESH.s4) S = 4;
  else if (majorCellPx >= SUBDIV_THRESH.s3) S = 3;
  else if (majorCellPx >= SUBDIV_THRESH.s2) S = 2;

  // Dot sizes (screen px) -> world radii
  const rMinorWorld = GRID.minorDotPx / Math.max(1e-6, cam.scale);
  const rMajorWorld = GRID.majorDotPx / Math.max(1e-6, cam.scale);

  // Visible world window (clamped)
  const lt = screenToWorld(0, 0);
  const rb = screenToWorld(window.width, window.height);
  const minX = Math.max(Math.min(lt.x, rb.x), WB.minX);
  const maxX = Math.min(Math.max(lt.x, rb.x), WB.maxX);
  const minY = Math.max(Math.min(lt.y, rb.y), WB.minY);
  const maxY = Math.min(Math.max(lt.y, rb.y), WB.maxY);

  // Visible MAJOR index ranges
  const iMajStart = Math.floor((minX - WB.minX) / majorStepX);
  const iMajEnd   = Math.ceil ((maxX - WB.minX) / majorStepX);
  const jMajStart = Math.floor((minY - WB.minY) / majorStepY);
  const jMajEnd   = Math.ceil ((maxY - WB.minY) / majorStepY);

  const minorCol = window.color(60, 150, 220, 110);
  const majorCol = window.color(90, 190, 255, 170);

  window.push();
  window.translate(window.width/2, window.height/2);
  window.scale(cam.scale, cam.scale);
  window.translate(-cam.cx, -cam.cy);
  window.noStroke();

  // 1) MAJOR intersections (always)
  for (let iM = iMajStart; iM <= iMajEnd; iM++){
    const xMaj = WB.minX + iM * majorStepX;
    if (xMaj < WB.minX || xMaj > WB.maxX) continue;
    for (let jM = jMajStart; jM <= jMajEnd; jM++){
      const yMaj = WB.minY + jM * majorStepY;
      if (yMaj < WB.minY || yMaj > WB.maxY) continue;
      window.fill(majorCol);
      window.circle(xMaj, yMaj, rMajorWorld);
    }
  }

  // 2) MINOR intersections (strictly interior: u,v = 1..S-1) with perf thinning
  if (S > 1) {
    const cx = cam.cx, cy = cam.cy;
    const halfDiagPx = Math.hypot(window.width, window.height) * 0.5;
    const innerRadiusPx = halfDiagPx * 0.6;
    const outerRadiusPx = halfDiagPx * 1.05;

    for (let iM = iMajStart; iM <= iMajEnd; iM++){
      const x0 = WB.minX + iM * majorStepX;
      const x1 = x0 + majorStepX;
      if (x0 > WB.maxX || x1 < WB.minX) continue;

      for (let jM = jMajStart; jM <= jMajEnd; jM++){
        const y0 = WB.minY + jM * majorStepY;
        const y1 = y0 + majorStepY;
        if (y0 > WB.maxY || y1 < WB.minY) continue;

        for (let u = 1; u <= S-1; u++){
          const xf = x0 + (u / S) * majorStepX;
          if (xf < minX - majorStepX || xf > maxX + majorStepX) continue;
          const minorIdxX = iM * S + u;

          for (let v = 1; v <= S-1; v++){
            const yf = y0 + (v / S) * majorStepY;
            if (yf < minY - majorStepY || yf > maxY + majorStepY) continue;

            const dxPx = Math.abs((xf - cx) * cam.scale);
            const dyPx = Math.abs((yf - cy) * cam.scale);
            const dPx  = Math.hypot(dxPx, dyPx);

            let drawMinor = true;
            if (dPx > innerRadiusPx) {
              const parity = (minorIdxX + (jM * S + v)) & 1;
              if (dPx <= outerRadiusPx) {
                drawMinor = (parity === 0);        // ~50%
              } else {
                if (S >= 4) {
                  const q = (minorIdxX + (jM * S + v)) & 3;
                  drawMinor = (q === 0);          // ~25%
                } else {
                  drawMinor = false;
                }
              }
            }

            if (drawMinor) {
              window.fill(minorCol);
              window.circle(xf, yf, rMinorWorld);
            }
          }
        }
      }
    }
  }

  // 3) Guarantee majors at exact world corners
  window.fill(majorCol);
  window.circle(WB.minX, WB.minY, rMajorWorld);
  window.circle(WB.maxX, WB.minY, rMajorWorld);
  window.circle(WB.minX, WB.maxY, rMajorWorld);
  window.circle(WB.maxX, WB.maxY, rMajorWorld);

  window.pop();
}
