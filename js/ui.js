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

  // Helper: parse numbers safely
  const num = v => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  // Rebuild if not running; otherwise changes take effect next growth step
  function maybeRebuild() {
    if (!simulationRunning) rebuildForestFromProjected();
  }

  // --- Growth inputs (meters) ---
  const minDistM    = $('minDistM');
  const maxDistM    = $('maxDistM');
  const branchLenM  = $('branchLenM');

  function bindMeterInput(el, setter) {
    if (!el) return;
    const apply = () => { setter(num(el.value)); maybeRebuild(); };
    el.addEventListener('input',  apply);  // fires on each keystroke/spinner
    el.addEventListener('change', apply);  // fires on blur/Enter
  }

  bindMeterInput(minDistM,   v => { MIN_DIST_M   = Math.max(0, v); });
  bindMeterInput(maxDistM,   v => { MAX_DIST_M   = Math.max(0, v); });
  bindMeterInput(branchLenM, v => { BRANCH_LEN_M = Math.max(0, v); });

  // --- Seeds: count + radius (meters) ---
  const seedCount    = $('seedCount');
  const seedRadiusM  = $('seedRadiusM');

  if (seedCount) {
    const apply = () => {
      SEED_COUNT = Math.max(1, Math.floor(num(seedCount.value) || 1));
      rebuildForestFromProjected(); // seed layout changes -> rebuild always
    };
    seedCount.addEventListener('input', apply);
    seedCount.addEventListener('change', apply);
  }

  if (seedRadiusM) {
    const apply = () => {
      SEED_RADIUS_M = Math.max(0, num(seedRadiusM.value) || 0);
      SEED_RADIUS_WORLD = SEED_RADIUS_M * WORLD_UNITS_PER_METER;
      rebuildForestFromProjected();
    };
    seedRadiusM.addEventListener('input', apply);
    seedRadiusM.addEventListener('change', apply);
  }

  // --- Filter bulk actions ---
  const typesAllBtn   = $('typesAllBtn');
  const typesNoneBtn  = $('typesNoneBtn');
  const purityAllBtn  = $('purityAllBtn');
  const purityNoneBtn = $('purityNoneBtn');

  if (typesAllBtn)  typesAllBtn.onclick   = () => { selectedTypes = new Set(availableTypes);       buildFilterUI(); applyFilters(); };
  if (typesNoneBtn) typesNoneBtn.onclick  = () => { selectedTypes = new Set();                     buildFilterUI(); applyFilters(); };
  if (purityAllBtn) purityAllBtn.onclick  = () => { selectedPurities = new Set(availablePurities); buildFilterUI(); applyFilters(); };
  if (purityNoneBtn)purityNoneBtn.onclick = () => { selectedPurities = new Set();                  buildFilterUI(); applyFilters(); };

  // --- Start / Reset ---
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
    // Rebuild with *current* UI values (meters already copied to globals):
    rebuildForestFromProjected();
  };

  // --- Draggable panel ---
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
};
