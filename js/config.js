window.WORLD = {
  W: -324698.832031,
  E:  425301.832031,
  N: -375000,
  S:  375000
};

// Camera
window.CAM_PAN_X = 0;
window.CAM_PAN_Y = 0;
window.CAM_ZOOM  = 1;
window.BASE_FIT_ZOOM = 1;
window.ZOOM_MIN_MULT = 0.3;   // (still used by getZoomBounds override)
window.ZOOM_MAX_MULT = 60;

// --- Units ---
// Satisfactory / Unreal is typically centimeters → 100 units = 1 meter.
// If your dataset uses different scale, change this and the numbers will follow.
window.WORLD_UNITS_PER_METER = 100;

// Growth parameters (in METERS)
window.MIN_DIST_M   = 12;   // meters
window.MAX_DIST_M   = 60;   // meters
window.BRANCH_LEN_M = 6;    // meters

// Seeds
window.SEED_COUNT = 8;
window.SEED_RADIUS_M = 2000;                       // meters
window.SEED_RADIUS_WORLD = SEED_RADIUS_M * WORLD_UNITS_PER_METER;

// Sim state
window.simulationRunning = false;
window.leaves  = [];
window.trees   = [];

// Data / filters
window.allMarkers = [];
window.filteredMarkers = [];
window.nodePoints = [];

window.availableTypes = new Set();
window.availablePurities = new Set();
window.selectedTypes = new Set();
window.selectedPurities = new Set();

window.typeColorMap = {};
window.purityStrokeMap = { impure: 80, normal: 160, pure: 255 };
