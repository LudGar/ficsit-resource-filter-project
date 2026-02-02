window.buildFilterUI      = function () {
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

window.buildSeedTargetsUI = function () {
  const host = document.getElementById("seedTargetsContainer");
  if (!host) return;

  host.innerHTML = "";

  // Ensure assignments size
  if (!Array.isArray(SEED_TYPE_ASSIGNMENTS)) SEED_TYPE_ASSIGNMENTS = [];
  while (SEED_TYPE_ASSIGNMENTS.length < SEED_COUNT) SEED_TYPE_ASSIGNMENTS.push(null);
  if (SEED_TYPE_ASSIGNMENTS.length > SEED_COUNT) SEED_TYPE_ASSIGNMENTS.length = SEED_COUNT;

  const types = Array.from(availableTypes || []).sort();

  for (let i = 0; i < SEED_COUNT; i++) {
    const row = document.createElement("div");
    row.className = "seed-row";

    // color dot matches your per-tree hue
    const dot = document.createElement("div");
    dot.className = "seed-dot";
    dot.style.background = `hsl(${(i * 360) / Math.max(1, SEED_COUNT)}, 90%, 65%)`;

    const label = document.createElement("div");
    label.textContent = `Seed ${i}`;

    const sel = document.createElement("select");
    const optAny = document.createElement("option");
    optAny.value = "";
    optAny.textContent = "Any";
    sel.appendChild(optAny);

    for (const t of types) {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    }

    sel.value = SEED_TYPE_ASSIGNMENTS[i] || "";
    sel.onchange = () => {
      SEED_TYPE_ASSIGNMENTS[i] = sel.value ? sel.value : null;
      if (!simulationRunning) rebuildForestFromProjected();
    };

    row.appendChild(dot);
    row.appendChild(label);
    row.appendChild(sel);
    host.appendChild(row);
  }
};

window.bindUI = function () {
  const $ = id => document.getElementById(id);

  const seedsAnyBtn = document.getElementById("seedsAnyBtn");
  if (seedsAnyBtn) seedsAnyBtn.onclick = () => {
    SEED_TYPE_ASSIGNMENTS = Array.from({ length: SEED_COUNT }, () => null);
    buildSeedTargetsUI();
    if (!simulationRunning) rebuildForestFromProjected();
  };

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
  const seedRotation = $('seedRotation');
  
  if (seedCount) {
    const apply = () => {
      SEED_COUNT = Math.max(1, Math.floor(num(seedCount.value) || 1));
      rebuildForestFromProjected();
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
  
  if (seedRotation) {
    const apply = () => {
      SEED_ROTATION_DEG = num(seedRotation.value) || 0;
      rebuildForestFromProjected();
    };
    seedRotation.addEventListener('input', apply);
    seedRotation.addEventListener('change', apply);
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
      if (typeof buildSeedTargetsUI === "function") buildSeedTargetsUI();
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

  const originRadios = document.querySelectorAll('input[name="originMode"]');
    originRadios.forEach(r => {
      r.addEventListener('change', e => {
        if (!e.target.checked) return;
        originMode = e.target.value === 'world' ? 'world' : 'game';
      });
    });
  
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
