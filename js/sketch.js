let mapTiles = {
  "0-0": null, // top-left
  "0-1": null, // bottom-left
  "1-0": null, // top-right
  "1-1": null  // bottom-right
};

function drawMapTile(img, wx1, wy1, wx2, wy2) {
  if (!img) return;
  
  const p1 = worldToScreen(wx1, wy1); // top-left
  const p2 = worldToScreen(wx2, wy2); // bottom-right

  const sx = p1.x;
  const sy = p1.y;
  const sw = p2.x - p1.x;
  const sh = p2.y - p1.y;

  image(img, sx, sy, sw, sh);
}

function drawMapLayer() {
  const { W, E, N, S } = WORLD;
  const midX = (W + E) / 2;
  const midY = (N + S) / 2;

  push();
  tint(255, 210);

  // Map_0-0: top-left
  drawMapTile(mapTiles["0-0"], W, N, midX, midY);
  // Map_0-1: bottom-left
  drawMapTile(mapTiles["0-1"], W, midY, midX, S);
  // Map_1-0: top-right
  drawMapTile(mapTiles["1-0"], midX, N, E, midY);
  // Map_1-1: bottom-right
  drawMapTile(mapTiles["1-1"], midX, midY, E, S);

  pop();
}

function drawRegularPolygon(cx, cy, r, sides) {
  beginShape();
  for (let i = 0; i < sides; i++) {
    const angle = TWO_PI * (i / sides) - HALF_PI;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    vertex(x, y);
  }
  endShape(CLOSE);
}

function drawBlueprintGrid() {
  background(10, 24, 44);
  
  const targetPx = 48;
  let stepWorld = targetPx / CAM_ZOOM;
  
  const pow10 = Math.pow(10, Math.floor(Math.log10(stepWorld || 1)));
  const cand = [1, 2, 5].map(k => k * pow10);
  stepWorld = cand.reduce((best, s) =>
    Math.abs(s - stepWorld) < Math.abs(best - stepWorld) ? s : best,
  cand[0]);
  
  const pxSpacing = stepWorld * CAM_ZOOM;
  if (pxSpacing < 2) return;

  const tl = screenToWorld(0, 0);
  const br = screenToWorld(width, height);
  const minX = Math.min(tl.x, br.x);
  const maxX = Math.max(tl.x, br.x);
  const minY = Math.min(tl.y, br.y);
  const maxY = Math.max(tl.y, br.y);

  const startX = Math.floor(minX / stepWorld) * stepWorld;
  const startY = Math.floor(minY / stepWorld) * stepWorld;

  noStroke();
  fill(180, 200, 255, 160);
  const dotSize = 2;
  let drawn = 0, maxDots = 50000;

  for (let x = startX; x <= maxX; x += stepWorld) {
    for (let y = startY; y <= maxY; y += stepWorld) {
      if (drawn++ > maxDots) break;
      const p = worldToScreen(x, y);
      circle(p.x, p.y, dotSize);
    }
  }

  const majorStep = stepWorld * 10;
  stroke(80, 120, 200, 100);
  strokeWeight(1);
  for (let x = Math.floor(minX / majorStep) * majorStep; x <= maxX; x += majorStep) {
    const p1 = worldToScreen(x, minY);
    const p2 = worldToScreen(x, maxY);
    line(p1.x, p1.y, p2.x, p2.y);
  }
  for (let y = Math.floor(minY / majorStep) * majorStep; y <= maxY; y += majorStep) {
    const p1 = worldToScreen(minX, y);
    const p2 = worldToScreen(maxX, y);
    line(p1.x, p1.y, p2.x, p2.y);
  }

  const origin = worldToScreen(0, 0);
  stroke(255, 120, 120, 200);
  strokeWeight(2);
  line(origin.x - 10, origin.y, origin.x + 10, origin.y);
  line(origin.x, origin.y - 10, origin.x, origin.y + 10);
  noStroke();
  fill(255, 180, 180);
  circle(origin.x, origin.y, 4);
}

function drawNodeOverlay() {
  if (!allNodeMarkers || allNodeMarkers.length === 0) return;

  push();
  textAlign(CENTER, CENTER);
  textSize(8);

  for (const n of allNodeMarkers) {
    const rgb = typeColorMap[n.type] || [200, 200, 200];
    const strokeVal = purityStrokeMap[n.purity] ?? 140;
    const p = worldToScreen(n.x, n.y);

    // Fill color from type
    fill(rgb[0], rgb[1], rgb[2], 230);
    stroke(strokeVal);
    strokeWeight(1);

    const rOuter = 6;
    const rInner = 3;

    switch (n.purity) {
      case "impure":
        // circle
        circle(p.x, p.y, rOuter * 2);
        break;
      case "normal":
        // triangle
        drawRegularPolygon(p.x, p.y, rOuter, 3);
        break;
      case "pure":
        // hexagon
        drawRegularPolygon(p.x, p.y, rOuter, 6);
        break;
      default:
        // fallback: square
        drawRegularPolygon(p.x, p.y, rOuter, 4);
        break;
    }

    // small inner core
    noStroke();
    fill(0, 0, 0, 120);
    circle(p.x, p.y, rInner * 2);
  }

  pop();
}

function drawVoronoiOverlay() {
  if (!voronoiCells || voronoiCells.length === 0) return;
  noFill();
  stroke(40, 120, 220, 100);
  strokeWeight(1);
  for (const c of voronoiCells) {
    beginShape();
    for (const v of c.polygon) {
      const p = worldToScreen(v.x, v.y);
      vertex(p.x, p.y);
    }
    endShape(CLOSE);
  }
}

window.preload = function () {
  loadJSON("nodes.json", parseJsonPayload, () => console.warn("nodes.json missing"));

  // adjust paths if needed (e.g. "assets/Map_0-0.png")
  mapTiles["0-0"] = loadImage("img/Map_0-0.png");
  mapTiles["0-1"] = loadImage("img/Map_0-1.png");
  mapTiles["1-0"] = loadImage("img/Map_1-0.png");
  mapTiles["1-1"] = loadImage("img/Map_1-1.png");
};

window.setup = function () {
  createCanvas(window.innerWidth, window.innerHeight);
  pixelDensity(1);

  if (typeof bindUI === "function") {
    bindUI();
  } else {
    console.warn("bindUI missing");
  }

  autoFitCamera(false);

  const wait = setInterval(() => {
    if (window._dataReady) {
      clearInterval(wait);
      if (typeof buildFilterUI === "function") buildFilterUI();
      if (typeof applyFilters === "function") applyFilters();
    }
  }, 100);
};

window.draw = function () {
  if (simulationRunning) {
    runGrowthStep();
    
    if (leaves.length === 0) {
      simulationRunning = false;
      const btn = document.getElementById("startBtn");
      if (btn) btn.innerText = "Start Growth";
      console.log("[Simulation] Growth complete — all leaves reached.");
    }
  }
  
  drawBlueprintGrid();
  drawMapLayer();
  drawVoronoiOverlay();
  drawNodeOverlay();


  strokeWeight(1.2);
  for (const l of leaves) {
    const rgb = typeColorMap[l.type] || [160, 160, 160];
    const sw = purityStrokeMap[l.purity] ?? 140;
    stroke(sw);
    fill(rgb[0], rgb[1], rgb[2]);

    const p = worldToScreen(l.pos.x, l.pos.y);
    circle(p.x, p.y, 4);
  }

  stroke(230);
  strokeWeight(1.2);
    for (const t of trees) {
      for (const b of t.branches) {
        if (!b.parent) continue;
    
        const p1 = worldToScreen(b.pos.x, b.pos.y);
        const p2 = worldToScreen(b.parent.pos.x, b.parent.pos.y);
    
        // depth-based brightness fade
        const d = b.depth ?? 0;
        const fade = constrain(map(d, 0, 1200, 1.0, 0.1), 0.1, 1.0);
    
        const base = t.baseColor;
        const branchColor = lerpColor(base, color(0, 0, 0), 1 - fade);
    
        stroke(branchColor);
        strokeWeight(1.3);
        line(p1.x, p1.y, p2.x, p2.y);
      }
    }
  
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);
  text(
    `Leaves: ${leaves.length}  ${simulationRunning ? "(Running)" : "(Stopped)"}  ` +
    `Min: ${MIN_DIST_M}m  Max: ${MAX_DIST_M}m  Step: ${BRANCH_LEN_M}m  Seeds: ${SEED_COUNT}`,
    10, 10
  );
};

let dragging = false;
let dragStart, panStart;

window.mousePressed = function () {
  dragging = true;
  dragStart = createVector(mouseX, mouseY);
  panStart = { x: CAM_PAN_X, y: CAM_PAN_Y };
};

window.mouseDragged = function () {
  if (!dragging) return;
  CAM_PAN_X = panStart.x + (mouseX - dragStart.x);
  CAM_PAN_Y = panStart.y + (mouseY - dragStart.y);
};

window.mouseReleased = function () {
  dragging = false;
};

window.mouseWheel = function (e) {
  const zf = Math.pow(1.0020, -e.delta);
  const { min, max } = getZoomBounds();
  let nz = CAM_ZOOM * zf;
  nz = Math.max(min, Math.min(max, nz));

  const scale = nz / CAM_ZOOM;
  CAM_ZOOM = nz;


  CAM_PAN_X = (CAM_PAN_X - (mouseX - width / 2)) * scale + (mouseX - width / 2);
  CAM_PAN_Y = (CAM_PAN_Y - (mouseY - height / 2)) * scale + (mouseY - height / 2);
  return false;
};

window.doubleClicked = function (e) {
  if (e && (e.ctrlKey || e.metaKey)) {
    autoFitCamera(false);
  }
};

window.windowResized = function () {
  resizeCanvas(window.innerWidth, window.innerHeight);
  autoFitCamera(true);
};
