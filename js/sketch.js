function drawBlueprintGrid() {
  background(10, 24, 44);

  // Desired pixel spacing at 100 % zoom
  const targetPx = 48;            // ⬅️ doubled from 24 → fewer dots
  let stepWorld = targetPx / CAM_ZOOM;

  // Snap to a nice 1-2-5 sequence
  const pow10 = Math.pow(10, Math.floor(Math.log10(stepWorld || 1)));
  const cand = [1, 2, 5].map(k => k * pow10);
  stepWorld = cand.reduce((b, s) =>
    Math.abs(s - stepWorld) < Math.abs(b - stepWorld) ? s : b,
  cand[0]);

  // If dots would be < 2 px apart, skip small ones entirely
  const pxSpacing = stepWorld * CAM_ZOOM;
  if (pxSpacing < 2) return;

  // View bounds in world space
  const tl = screenToWorld(0, 0);
  const br = screenToWorld(width, height);
  const minX = Math.min(tl.x, br.x);
  const maxX = Math.max(tl.x, br.x);
  const minY = Math.min(tl.y, br.y);
  const maxY = Math.max(tl.y, br.y);

  // Start aligned to grid
  const startX = Math.floor(minX / stepWorld) * stepWorld;
  const startY = Math.floor(minY / stepWorld) * stepWorld;

  noStroke();
  fill(180, 200, 255, 160);
  const dotSize = 2;

  // Limit max dots per frame (~50 000 safe)
  let drawn = 0, maxDots = 50000;

  for (let x = startX; x <= maxX; x += stepWorld) {
    for (let y = startY; y <= maxY; y += stepWorld) {
      if (drawn++ > maxDots) break;
      const p = worldToScreen(x, y);
      circle(p.x, p.y, dotSize);
    }
  }

  // Major grid lines every 10 minor steps
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

  // Origin crosshair
  const origin = worldToScreen(0, 0);
  stroke(255, 120, 120, 200);
  strokeWeight(2);
  line(origin.x - 10, origin.y, origin.x + 10, origin.y);
  line(origin.x, origin.y - 10, origin.x, origin.y + 10);
  noStroke();
  fill(255, 180, 180);
  circle(origin.x, origin.y, 4);
}

// --- Voronoi overlay (world -> screen) ---
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

// --- Load data ---
window.preload = function () {
  loadJSON("nodes.json", parseJsonPayload, () => console.warn("nodes.json missing"));
};

// --- Setup ---
window.setup = function () {
  createCanvas(window.innerWidth, window.innerHeight);
  pixelDensity(1);

  if (typeof bindUI === "function") bindUI();
  else console.warn("bindUI missing");

  autoFitCamera(false); // fit to world on first load

  const wait = setInterval(() => {
    if (window._dataReady) {
      clearInterval(wait);
      if (typeof buildFilterUI === "function") buildFilterUI();
      if (typeof applyFilters === "function") applyFilters();
    }
  }, 100);
};

// --- Draw loop ---
window.draw = function () {
  if (simulationRunning) {
    runGrowthStep();

    // Stop automatically once all leaves reached
    if (leaves.length === 0) {
      simulationRunning = false;
      const btn = document.getElementById("startBtn");
      if (btn) btn.innerText = "Start Growth";
      console.log("[Simulation] Growth complete — all leaves reached.");
    }
  }

  drawBlueprintGrid();
  drawVoronoiOverlay();

  // Leaves (world -> screen)
  strokeWeight(1.2);
  for (const l of leaves) {
    const rgb = typeColorMap[l.type] || [160, 160, 160];
    const sw = purityStrokeMap[l.purity] ?? 140;
    stroke(sw);
    fill(rgb[0], rgb[1], rgb[2]);
    const p = worldToScreen(l.pos.x, l.pos.y);
    circle(p.x, p.y, 4);
  }

  // Branches (world -> screen)
  stroke(230);
  strokeWeight(1.2);
  for (const t of trees)
    for (const b of t.branches)
      if (b.parent) {
        const p1 = worldToScreen(b.pos.x, b.pos.y);
        const p2 = worldToScreen(b.parent.pos.x, b.parent.pos.y);
        line(p1.x, p1.y, p2.x, p2.y);
      }

  // HUD
  noStroke();
  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);
  text(`Leaves: ${leaves.length}  ${simulationRunning ? "(Running)" : "(Stopped)"}`, 10, 10);
};

// --- Camera interaction (no reproject needed; draw in world space) ---
let dragging = false, dragStart, panStart;
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
window.mouseReleased = function () { dragging = false; };
window.mouseWheel = function (e) {
  const zf = Math.pow(1.0015, -e.delta);
  const { min, max } = getZoomBounds();
  let nz = CAM_ZOOM * zf;
  nz = Math.max(min, Math.min(max, nz));
  const scale = nz / CAM_ZOOM;
  CAM_ZOOM = nz;
  // zoom to mouse
  CAM_PAN_X = (CAM_PAN_X - (mouseX - width / 2)) * scale + (mouseX - width / 2);
  CAM_PAN_Y = (CAM_PAN_Y - (mouseY - height / 2)) * scale + (mouseY - height / 2);
  return false;
};
window.doubleClicked = function (e) {
  if (e && (e.ctrlKey || e.metaKey)) autoFitCamera(false);
};
window.windowResized = function () {
  resizeCanvas(window.innerWidth, window.innerHeight);
  autoFitCamera(true); // preserve relative zoom on resize
};
