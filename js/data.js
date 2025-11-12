// --- COLOR UTILS ---
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return [f(0), f(8), f(4)];
}

window.allNodeMarkers = [];

window.parseJsonPayload = function parseJsonPayload(data) {
  if (!data || !data.options) return;

  allMarkers = [];
  availableTypes.clear();
  availablePurities.clear();

  const layers = data.options.find(o => o.tabId === "resource_nodes");
  if (!layers) return;

  for (const cat of layers.options) {
    for (const purity of cat.options) {
      const purityLevel = purity.purity || "unknown";
      availablePurities.add(purityLevel);
      for (const m of purity.markers) {
        const t = m.type || cat.name || "unknown";
        availableTypes.add(t);
        allMarkers.push({ x: +m.x, y: +m.y, type: t, purity: purityLevel });
      }
    }
  }

  // Assign palette per type
  const typesArr = Array.from(availableTypes);
  typesArr.forEach((t, i) => {
    const rgb = hslToRgb((i / Math.max(1, typesArr.length)) * 1.0, 0.7, 0.6);
    typeColorMap[t] = rgb;
  });

  selectedTypes = new Set(availableTypes);
  selectedPurities = new Set(availablePurities);
  window._dataReady = true;

  console.log(`[Data] Parsed markers: ${allMarkers.length}`);
};

allNodeMarkers = nodePoints.map(p => ({ ...p }));

// Build Voronoi in WORLD space, then draw by mapping to screen
function buildVoronoiLayerWorld() {
  if (!nodePoints || nodePoints.length === 0) return [];
  const pts = nodePoints.map(p => [p.x, p.y]); // world coords
  const { W, E, N, S } = WORLD;
  const delaunay = d3.Delaunay.from(pts);
  const voronoi = delaunay.voronoi([W, N, E, S]); // WORLD bounds
  const cells = [];
  for (let i = 0; i < pts.length; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    cells.push({
      index: i,
      center: createVector(nodePoints[i].x, nodePoints[i].y), // world
      polygon: poly.map(([x, y]) => createVector(x, y))       // world
    });
  }
  return cells;
}

window.voronoiCells = [];

window.applyFilters = function () {
  filteredMarkers = allMarkers.filter(
    m => selectedTypes.has(m.type) && selectedPurities.has(m.purity)
  );

  // WORLD coordinates (no projection)
  nodePoints = filteredMarkers.map(m => ({ x: m.x, y: m.y }));

  // Keep a static copy for the overlay layer
  allNodeMarkers = filteredMarkers.map(m => ({ ...m }));

  const c = document.getElementById("nodesCount");
  if (c) c.textContent = String(nodePoints.length);

  rebuildForestFromProjected();
  window.voronoiCells = buildVoronoiLayerWorld();

  console.log(`[Data] applyFilters(): ${nodePoints.length} nodes visible`);
};
