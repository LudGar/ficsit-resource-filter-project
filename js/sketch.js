let canvas;

// Map tiles (adjust paths in preload if needed)
let mapTiles = {
  "0-0": null,
  "0-1": null,
  "1-0": null,
  "1-1": null
};

// Camera state (expected to be global in your project)
window.CAM_X = window.CAM_X ?? 0;
window.CAM_Y = window.CAM_Y ?? 0;
window.CAM_ZOOM = window.CAM_ZOOM ?? 0.001;

// Required globals from your other files (expected)
window.CONVEYOR_WIDTH_M = window.CONVEYOR_WIDTH_M ?? 2;

// Drag state
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

/* ============================
   Coordinate transforms
============================ */

function worldToScreen(wx, wy) {
  // Camera centered on (CAM_X, CAM_Y)
  const sx = (wx - CAM_X) * CAM_ZOOM + width * 0.5;
  const sy = (wy - CAM_Y) * CAM_ZOOM + height * 0.5;
  return { x: sx, y: sy };
}

function screenToWorld(sx, sy) {
  const wx = (sx - width * 0.5) / CAM_ZOOM + CAM_X;
  const wy = (sy - height * 0.5) / CAM_ZOOM + CAM_Y;
  return { x: wx, y: wy };
}

/* ============================
   Preload
============================ */

window.preload = function () {
  // nodes.json
  if (typeof parseJsonPayload === "function") {
    loadJSON("nodes.json", parseJsonPayload);
  } else {
    console.warn("[Sketch] parseJsonPayload missing (data.js not loaded yet?)");
  }

  // Map tiles (adjust folder as needed)
  mapTiles["0-0"] = loadImage("img/Map_0-0.png");
  mapTiles["0-1"] = loadImage("img/Map_0-1.png");
  mapTiles["1-0"] = loadImage("img/Map_1-0.png");
  mapTiles["1-1"] = loadImage("img/Map_1-1.png");
};

/* ============================
   Setup
============================ */

window.setup = function () {
  canvas = createCanvas(window.innerWidth, window.innerHeight);
  pixelDensity(1);

  // Fit world initially
  fitWorldToView();

  // Bind UI if present
  if (typeof bindUI === "function") bindUI();

  // Build data if present
  if (typeof applyFilters === "function") applyFilters();

  console.log("[Sketch] setup complete");
};

/* ============================
   Draw
============================ */

window.draw = function () {
  // Run growth only if active
  if (window.simulationRunning) {
    if (typeof runGrowthStep === "function") runGrowthStep();
  }

  // Render order
  drawMapLayer();
  drawBlueprintGrid();
  drawSeedsLayerSafe();
  //drawVoronoiOverlaySafe();
  drawBranches();
  drawNodeOverlay();
  drawMouseHUD();
};

/* ============================
   Map layer
============================ */

function drawMapLayer() {
  background(10, 24, 44);

  if (!window.WORLD) return;
  const { W, E, N, S } = WORLD;
  const mx = (W + E) * 0.5;
  const my = (N + S) * 0.5;

  push();
  tint(255, 215);

  drawMapTile(mapTiles["0-0"], W, N, mx, my);   // top-left
  drawMapTile(mapTiles["0-1"], W, my, mx, S);   // bottom-left
  drawMapTile(mapTiles["1-0"], mx, N, E, my);   // top-right
  drawMapTile(mapTiles["1-1"], mx, my, E, S);   // bottom-right

  pop();
}

function drawMapTile(img, wx1, wy1, wx2, wy2) {
  if (!img) return;
  const p1 = worldToScreen(wx1, wy1);
  const p2 = worldToScreen(wx2, wy2);
  image(img, p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
}

/* ============================
   Blueprint grid (WORLD locked)
============================ */

function drawBlueprintGrid() {
  // Dot grid in world-space, tuned for performance
  const targetPx = 56; // larger => fewer dots
  let stepWorld = targetPx / CAM_ZOOM;

  // Snap to 1-2-5 x 10^n
  const pow10 = Math.pow(10, Math.floor(Math.log10(stepWorld || 1)));
  const cand = [1, 2, 5].map(k => k * pow10);
  stepWorld = cand.reduce((best, s) =>
    Math.abs(s - stepWorld) < Math.abs(best - stepWorld) ? s : best,
    cand[0]
  );

  const pxSpacing = stepWorld * CAM_ZOOM;
  if (pxSpacing < 2) return;

  // Viewport bounds in world coords
  const tl = screenToWorld(0, 0);
  const br = screenToWorld(width, height);
  const minX = Math.min(tl.x, br.x);
  const maxX = Math.max(tl.x, br.x);
  const minY = Math.min(tl.y, br.y);
  const maxY = Math.max(tl.y, br.y);

  const startX = Math.floor(minX / stepWorld) * stepWorld;
  const startY = Math.floor(minY / stepWorld) * stepWorld;

  // Dots
  noStroke();
  fill(180, 200, 255, 110);
  let drawn = 0;
  const maxDots = 35000;

  for (let x = startX; x <= maxX; x += stepWorld) {
    for (let y = startY; y <= maxY; y += stepWorld) {
      if (drawn++ > maxDots) break;
      const p = worldToScreen(x, y);
      circle(p.x, p.y, 2);
    }
  }

  // Major lines every 10 steps
  const major = stepWorld * 10;
  stroke(80, 120, 200, 80);
  strokeWeight(1);

  for (let x = Math.floor(minX / major) * major; x <= maxX; x += major) {
    const a = worldToScreen(x, minY);
    const b = worldToScreen(x, maxY);
    line(a.x, a.y, b.x, b.y);
  }
  for (let y = Math.floor(minY / major) * major; y <= maxY; y += major) {
    const a = worldToScreen(minX, y);
    const b = worldToScreen(maxX, y);
    line(a.x, a.y, b.x, b.y);
  }

  // Origin crosshair at game (0,0)
  const o = worldToScreen(0, 0);
  stroke(255, 120, 120, 180);
  strokeWeight(2);
  line(o.x - 10, o.y, o.x + 10, o.y);
  line(o.x, o.y - 10, o.x, o.y + 10);
  noStroke();
  fill(255, 180, 180);
  circle(o.x, o.y, 4);
}

/* ============================
   Seeds layer (safe)
============================ */

function drawSeedsLayerSafe() {
  if (!window.seedsWorld || seedsWorld.length === 0) return;
  if (!window.WORLD) return;

  const { W, E, N, S } = WORLD;
  const cx = (W + E) * 0.5;
  const cy = (N + S) * 0.5;

  // Radius circle if SEED_RADIUS_WORLD exists
  if (typeof window.SEED_RADIUS_WORLD === "number") {
    const c = worldToScreen(cx, cy);
    const r = worldToScreen(cx + SEED_RADIUS_WORLD, cy);
    const radiusPx = Math.abs(r.x - c.x);

    push();
    noFill();
    stroke(120, 200, 255, 130);
    strokeWeight(1.5);
    circle(c.x, c.y, radiusPx * 2);
    pop();
  }

  // Seed dots
  push();
  stroke(0, 150);
  strokeWeight(1);

  for (let i = 0; i < seedsWorld.length; i++) {
    const s = seedsWorld[i];
    const p = worldToScreen(s.x, s.y);

    let col = color(255);
    if (window.trees && trees[i] && trees[i].baseColor) col = trees[i].baseColor;

    fill(col);
    circle(p.x, p.y, 10);

    noStroke();
    fill(0, 140);
    circle(p.x, p.y, 3);
    stroke(0, 150);
  }

  pop();
}

/* ============================
   Voronoi overlay (safe)
============================ */

function drawVoronoiOverlaySafe() {
  if (!window.voronoiCells || voronoiCells.length === 0) return;

  noFill();
  stroke(40, 120, 220, 90);
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

/* ============================
   Branch rendering (2m conveyor)
============================ */

function drawBranches() {
  if (!window.trees) return;

  const wupm = window.WORLD_UNITS_PER_METER ?? 1;
  const conveyorWorld = CONVEYOR_WIDTH_M * wupm;
  const conveyorPx = Math.max(1, conveyorWorld * CAM_ZOOM);

  for (const t of trees) {
    for (const b of t.branches) {
      if (!b.parent) continue;

      const a = worldToScreen(b.pos.x, b.pos.y);
      const c = worldToScreen(b.parent.pos.x, b.parent.pos.y);

      // Depth fade (if baseColor exists)
      const d = b.depth || 0;
      const fade = constrain(map(d, 0, 80, 1.0, 0.25), 0.25, 1.0);
      const base = t.baseColor || color(255);
      const col = lerpColor(base, color(0), 1 - fade);

      stroke(col);
      strokeWeight(conveyorPx);
      line(a.x, a.y, c.x, c.y);
    }
  }
}

/* ============================
   Static node overlay + shapes
============================ */

function drawRegularPolygon(cx, cy, r, sides) {
  beginShape();
  for (let i = 0; i < sides; i++) {
    const a = TWO_PI * (i / sides) - HALF_PI;
    vertex(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  endShape(CLOSE);
}

function drawNodeOverlay() {
  if (!window.allNodeMarkers || allNodeMarkers.length === 0) return;
  if (!window.typeColorMap) return;

  push();

  for (const n of allNodeMarkers) {
    const rgb = typeColorMap[n.type] || [200, 200, 200];
    const p = worldToScreen(n.x, n.y);

    fill(rgb[0], rgb[1], rgb[2], 220);
    const sw = (window.purityStrokeMap && purityStrokeMap[n.purity] != null)
      ? purityStrokeMap[n.purity]
      : 120;

    stroke(sw);
    strokeWeight(1);

    const r = 6;
    if (n.purity === "impure") {
      circle(p.x, p.y, r * 2);
    } else if (n.purity === "normal") {
      drawRegularPolygon(p.x, p.y, r, 3);
    } else if (n.purity === "pure") {
      drawRegularPolygon(p.x, p.y, r, 6);
    } else {
      drawRegularPolygon(p.x, p.y, r, 4);
    }
  }

  pop();
}

/* ============================
   Mouse HUD + tooltip
============================ */

function pickHoverNode(mx, my) {
  if (!window.allNodeMarkers) return null;

  const R = 10;
  let best = null;
  let bestD2 = R * R;

  for (const n of allNodeMarkers) {
    const p = worldToScreen(n.x, n.y);
    const dx = mx - p.x;
    const dy = my - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      best = n;
    }
  }
  return best;
}

function drawTooltip(mx, my, lines, accentRGB) {
  const pad = 8;
  const lineH = 14;

  textSize(12);
  textAlign(LEFT, TOP);

  let w = 0;
  for (const s of lines) w = Math.max(w, textWidth(s));
  const boxW = w + pad * 2;
  const boxH = lines.length * lineH + pad * 2;

  let x = mx + 14;
  let y = my + 14;
  if (x + boxW > width - 6) x = mx - boxW - 14;
  if (y + boxH > height - 6) y = my - boxH - 14;

  push();
  noStroke();
  fill(18, 22, 28, 220);
  rect(x, y, boxW, boxH, 10);

  if (accentRGB && accentRGB.length === 3) {
    fill(accentRGB[0], accentRGB[1], accentRGB[2], 220);
    rect(x, y, 4, boxH, 10);
  }

  fill(255);
  let ty = y + pad;
  for (const s of lines) {
    text(s, x + pad + 6, ty);
    ty += lineH;
  }
  pop();
}

function drawMouseHUD() {
  const mw = screenToWorld(mouseX, mouseY);

  push();
  noStroke();
  fill(255);
  textAlign(LEFT, BOTTOM);
  textSize(12);
  text(`Mouse WORLD: x ${mw.x.toFixed(1)}  y ${mw.y.toFixed(1)}`, 10, height - 10);
  pop();

  const hovered = pickHoverNode(mouseX, mouseY);
  if (!hovered) return;

  const rgb = (window.typeColorMap && typeColorMap[hovered.type]) || [200, 200, 200];
  const p = worldToScreen(hovered.x, hovered.y);

  push();
  noFill();
  stroke(rgb[0], rgb[1], rgb[2], 220);
  strokeWeight(2);
  circle(p.x, p.y, 18);
  pop();

  drawTooltip(
    mouseX,
    mouseY,
    [`${hovered.type} · ${hovered.purity}`, `x ${hovered.x.toFixed(1)}  y ${hovered.y.toFixed(1)}`],
    rgb
  );
}

/* ============================
   Camera interaction
============================ */

window.mousePressed = function () {
  isDragging = true;
  lastMouseX = mouseX;
  lastMouseY = mouseY;
};

window.mouseReleased = function () {
  isDragging = false;
};

window.mouseDragged = function () {
  if (!isDragging) return;

  // Pan in WORLD units
  CAM_X -= (mouseX - lastMouseX) / CAM_ZOOM;
  CAM_Y -= (mouseY - lastMouseY) / CAM_ZOOM;

  lastMouseX = mouseX;
  lastMouseY = mouseY;
};

window.mouseWheel = function (e) {
  const before = screenToWorld(mouseX, mouseY);

  const zoomFactor = e.delta > 0 ? 0.92 : 1.08;
  CAM_ZOOM = constrain(CAM_ZOOM * zoomFactor, 0.0002, 8);

  const after = screenToWorld(mouseX, mouseY);
  CAM_X += before.x - after.x;
  CAM_Y += before.y - after.y;

  return false;
};

window.doubleClicked = function () {
  fitWorldToView();
};

window.windowResized = function () {
  resizeCanvas(window.innerWidth, window.innerHeight);
  fitWorldToView();
};

/* ============================
   Fit camera to WORLD bounds
============================ */

function fitWorldToView() {
  if (!window.WORLD) return;

  const { W, E, N, S } = WORLD;
  const worldW = E - W;
  const worldH = S - N;

  CAM_ZOOM = 0.92 * Math.min(width / worldW, height / worldH);
  CAM_X = (W + E) * 0.5;
  CAM_Y = (N + S) * 0.5;
}
