window.WORLD = {
  W: -324698.832031,
  E:  425301.832031,
  N: -375000,
  S:  375000
};

window.CAM_PAN_X = 0;
window.CAM_PAN_Y = 0;
window.CAM_ZOOM  = 1;
window.BASE_FIT_ZOOM = 1;
window.ZOOM_MIN_MULT = 0.1;
window.ZOOM_MAX_MULT = 10;

window.MIN_DIST   = 12;
window.MAX_DIST   = 60;
window.BRANCH_LEN = 6;

window.SEED_COUNT = 8;
window.SEED_RADIUS_WORLD = 200000;

window.simulationRunning = false;
window.leaves  = [];
window.trees   = [];

window.allMarkers = [];
window.filteredMarkers = [];
window.nodePoints = [];

window.availableTypes = new Set();
window.availablePurities = new Set();
window.selectedTypes = new Set();
window.selectedPurities = new Set();

window.typeColorMap = {};
window.purityStrokeMap = { impure: 80, normal: 160, pure: 255 };
