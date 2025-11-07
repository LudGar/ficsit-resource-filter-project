window.buildFilterUI=function(){
  const typesContainer=document.getElementById("typesContainer");
  const puritiesContainer=document.getElementById("puritiesContainer");
  if(!typesContainer||!puritiesContainer)return;
  typesContainer.innerHTML=""; puritiesContainer.innerHTML="";

  Array.from(availableTypes).sort().forEach(t=>{
    const lbl=document.createElement("label");
    lbl.className="chip";
    const input=document.createElement("input");
    input.type="checkbox";
    input.checked=selectedTypes.has(t);
    const span=document.createElement("span");
    span.textContent=t;
    lbl.appendChild(input);lbl.appendChild(span);
    input.onchange=()=>{input.checked?selectedTypes.add(t):selectedTypes.delete(t);applyFilters();};
    typesContainer.appendChild(lbl);
  });

  Array.from(availablePurities).sort().forEach(p=>{
    const lbl=document.createElement("label");
    lbl.className="chip";
    const input=document.createElement("input");
    input.type="checkbox";
    input.checked=selectedPurities.has(p);
    const span=document.createElement("span");
    span.textContent=p;
    lbl.appendChild(input);lbl.appendChild(span);
    input.onchange=()=>{input.checked?selectedPurities.add(p):selectedPurities.delete(p);applyFilters();};
    puritiesContainer.appendChild(lbl);
  });

  console.log("[UI] Filter UI built");
};

window.bindUI=function(){
  const $=id=>document.getElementById(id);
  const minDist=$("minDist"),maxDist=$("maxDist"),branchLen=$("branchLen");
  const resetBtn=$("resetBtn"),startBtn=$("startBtn"),seedRadius=$("seedRadius");

  if(minDist)minDist.oninput=()=>MIN_DIST=+minDist.value;
  if(maxDist)maxDist.oninput=()=>MAX_DIST=+maxDist.value;
  if(branchLen)branchLen.oninput=()=>BRANCH_LEN=+branchLen.value;

  if(seedRadius)seedRadius.oninput=()=>{
    SEED_RADIUS_WORLD=+seedRadius.value; rebuildForestFromProjected();
  };

  if (resetBtn) resetBtn.onclick = () => {
    simulationRunning = false;
    if (startBtn) startBtn.innerText = "Start Growth";
    autoFitCamera(false);           // fit to world
    // no reproject() anymore (we draw in world-space)
    rebuildForestFromProjected();   // rebuild seeds + leaves into trees
  };

  if(startBtn)startBtn.onclick=()=>{
    if(leaves.length===0||trees.length===0){if(typeof applyFilters==="function")applyFilters();}
    if(leaves.length===0||trees.length===0){console.warn("[Start] no data");return;}
    simulationRunning=!simulationRunning;
    startBtn.innerText=simulationRunning?"Pause Growth":"Start Growth";
  };

  // Make UI draggable
  const ui=document.getElementById("ui");
  const title=document.getElementById("uiTitle");
  let drag=false,offset={x:0,y:0};
  title.addEventListener("mousedown",e=>{
    drag=true;offset.x=e.clientX-ui.offsetLeft;offset.y=e.clientY-ui.offsetTop;
  });
  document.addEventListener("mouseup",()=>drag=false);
  document.addEventListener("mousemove",e=>{
    if(!drag)return;
    ui.style.left=e.clientX-offset.x+"px";
    ui.style.top=e.clientY-offset.y+"px";
  });

  console.log("[UI] Bound successfully");
};
