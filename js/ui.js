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

window.bindUI = function () {
  const $ = id => document.getElementById(id);

  // Growth inputs (meters)
  const minDistM   = $('minDistM');
  const maxDistM   = $('maxDistM');
  const branchLenM = $('branchLenM');

  if (minDistM)   minDistM.oninput   = () => { MIN_DIST_M   = Math.max(0, +minDistM.value);   };
  if (maxDistM)   maxDistM.oninput   = () => { MAX_DIST_M   = Math.max(0, +maxDistM.value);   };
  if (branchLenM) branchLenM.oninput = () => { BRANCH_LEN_M = Math.max(0, +branchLenM.value); };

  // Seeds: count + radius in meters
  const seedCount  = $('seedCount');
  const seedRadiusM = $('seedRadiusM');

  if (seedCount) seedCount.oninput = () => {
    SEED_COUNT = Math.max(1, Math.floor(+seedCount.value || 1));
    rebuildForestFromProjected();
  };

  if (seedRadiusM) seedRadiusM.oninput = () => {
    SEED_RADIUS_M = Math.max(0, +seedRadiusM.value || 0);
    SEED_RADIUS_WORLD = SEED_RADIUS_M * WORLD_UNITS_PER_METER;
    rebuildForestFromProjected();
  };

  // Filters UI (already created by buildFilterUI)
  const typesAllBtn  = $('typesAllBtn');
  const typesNoneBtn = $('typesNoneBtn');
  const purityAllBtn  = $('purityAllBtn');
  const purityNoneBtn = $('purityNoneBtn');

  if (typesAllBtn)  typesAllBtn.onclick  = () => { selectedTypes = new Set(availableTypes);  buildFilterUI(); applyFilters(); };
  if (typesNoneBtn) typesNoneBtn.onclick = () => { selectedTypes = new Set();                buildFilterUI(); applyFilters(); };
  if (purityAllBtn) purityAllBtn.onclick  = () => { selectedPurities = new Set(availablePurities); buildFilterUI(); applyFilters(); };
  if (purityNoneBtn)purityNoneBtn.onclick = () => { selectedPurities = new Set();                 buildFilterUI(); applyFilters(); };

  // Start / Reset
  const startBtn = $('startBtn');
  const resetBtn = $('resetBtn');

  if (startBtn) startBtn.onclick = () => {
    if (leaves.length === 0 || trees.length === 0) {
      if (typeof applyFilters === 'function') applyFilters();
    }
    if (leaves.length === 0 || trees.length === 0) {
      console.warn('[Start] No leaves/trees — check filters');
      return;
    }
    simulationRunning = !simulationRunning;
    startBtn.innerText = simulationRunning ? 'Pause Growth' : 'Start Growth';
  };

  if (resetBtn) resetBtn.onclick = () => {
    simulationRunning = false;
    if (startBtn) startBtn.innerText = 'Start Growth';
    autoFitCamera(false);
    rebuildForestFromProjected();
  };

  // Make UI draggable
  const ui = document.getElementById('ui');
  const title = document.getElementById('uiTitle');
  let dragging = false, offset = { x: 0, y: 0 };
  if (ui && title) {
    title.addEventListener('mousedown', e => {
      dragging = true; offset.x = e.clientX - ui.offsetLeft; offset.y = e.clientY - ui.offsetTop;
    });
    document.addEventListener('mouseup', () => dragging = false);
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      ui.style.left = (e.clientX - offset.x) + 'px';
      ui.style.top  = (e.clientY - offset.y) + 'px';
    });
  }

  console.log('[UI] Bound successfully');
};
