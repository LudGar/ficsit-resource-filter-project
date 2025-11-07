// --- CAMERA TRANSFORMS (GLOBAL) ---

// Current zoom bounds relative to the fitted zoom
window.getZoomBounds = function () {
  return {
    min: BASE_FIT_ZOOM * 0.05, // 5% of fit
    max: BASE_FIT_ZOOM * 20    // 20× fit
  };
};

// Fit the full WORLD rect [W,E]×[N,S] to the window
window.autoFitCamera = function (preserve = false) {
  const { W, E, N, S } = WORLD;
  const worldW = E - W;
  const worldH = S - N;

  const scaleX = width / worldW;   // px per world unit
  const scaleY = height / worldH;
  const padding = 0.9;             // 90% (add a little margin)
  const fitScale = Math.min(scaleX, scaleY) * padding;

  const prevBase = BASE_FIT_ZOOM;
  const prevZoom = CAM_ZOOM;
  BASE_FIT_ZOOM = fitScale;

  if (preserve && prevBase > 0) {
    const ratio = prevZoom / prevBase;
    CAM_ZOOM = BASE_FIT_ZOOM * ratio;
  } else {
    CAM_ZOOM = BASE_FIT_ZOOM;
  }

  // Center on world center
  CAM_PAN_X = 0;
  CAM_PAN_Y = 0;
};

// Screen <-> World conversions (attach to window!)
window.screenToWorld = function (sx, sy) {
  const { W, E, N, S } = WORLD;
  const cx = (W + E) / 2;
  const cy = (N + S) / 2;
  return {
    x: (sx - width / 2 - CAM_PAN_X) / CAM_ZOOM + cx,
    y: (sy - height / 2 - CAM_PAN_Y) / CAM_ZOOM + cy
  };
};

window.worldToScreen = function (wx, wy) {
  const { W, E, N, S } = WORLD;
  const cx = (W + E) / 2;
  const cy = (N + S) / 2;
  return {
    x: (wx - cx) * CAM_ZOOM + width / 2 + CAM_PAN_X,
    y: (wy - cy) * CAM_ZOOM + height / 2 + CAM_PAN_Y
  };
};
