// ---- Seeds: 8 around world center every 45° (world coords) ----
function getCurrentSeedWorlds() {
  const { W, E, N, S } = WORLD;
  const cx = (W + E) / 2, cy = (N + S) / 2;
  const R = SEED_RADIUS_WORLD;
  const seeds = [];
  for (let i = 0; i < 8; i++) {
    const a = radians(i * 45);
    seeds.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  }
  return seeds;
}

// ---- Rebuild forest from current nodePoints (WORLD) & seeds (WORLD) ----
window.rebuildForestFromProjected = function () {
  trees = [];
  leaves = [];

  // leaves in WORLD
  for (let i = 0; i < nodePoints.length; i++) {
    const m = nodePoints[i];
    const meta = filteredMarkers[i] || { type: "unknown", purity: "unknown" };
    leaves.push(new Leaf(m.x, m.y, meta.type, meta.purity));
  }

  // seeds in WORLD
  const seeds = getCurrentSeedWorlds();
  for (const s of seeds) trees.push(new Tree(createVector(s.x, s.y)));
};

// ---- 45° snap helper (screen-space) ----
function snapTo45DegScreen(vec) {
  const step = radians(45);
  const ang = vec.heading();
  const snapped = Math.round(ang / step) * step;
  return p5.Vector.fromAngle(snapped);
}

// ---- Leaf (WORLD) ----
window.Leaf = class {
  constructor(x, y, type, purity) {
    this.pos = createVector(x, y); // WORLD
    this.type = type;
    this.purity = purity;
    this.reached = false;
  }
};

// ---- Branch (WORLD) ----
window.Branch = class {
  constructor(parent, pos, dirWorld) {
    this.parent = parent;
    this.pos = pos;          // WORLD
    this.dir = dirWorld;     // WORLD direction (unit-ish)
    this.count = 0;
    this.nextDirScreen = createVector(0, 0); // accumulate in SCREEN space
  }

  // Advance BRANCH by a SCREEN-space step in given SCREEN-space unit direction
  nextFromScreenDir(dirScreenUnit, stepPx) {
    // screen point for current world position
    const p1sObj = worldToScreen(this.pos.x, this.pos.y);     // {x,y} plain object
    const p1s    = createVector(p1sObj.x, p1sObj.y);          // ✅ make it a p5.Vector

    // step on screen
    const p2s    = p5.Vector.add(p1s, p5.Vector.mult(dirScreenUnit, stepPx));

    // back to world
    const p2wObj = screenToWorld(p2s.x, p2s.y);
    const newPosW = createVector(p2wObj.x, p2wObj.y);

    // derive a world-space direction
    const dirW = p5.Vector.sub(newPosW, this.pos);
    if (dirW.magSq() > 0) dirW.normalize();

    return new Branch(this, newPosW, dirW);
  }


  reset() {
    this.nextDirScreen.set(0, 0);
    this.count = 0;
  }
};

// ---- Tree (WORLD) with screen-space distances/steps ----
window.Tree = class {
  constructor(rootWorld) {
    this.branches = [];

    // Initial direction toward nearest leaf (in SCREEN space)
    let dirScreen = createVector(0, -1);
    if (leaves.length > 0) {
      let nearest = null, best = Infinity;
      const rootS = worldToScreen(rootWorld.x, rootWorld.y);
      for (const l of leaves) {
        const lp = worldToScreen(l.pos.x, l.pos.y);
        const d = p5.Vector.dist(createVector(rootS.x, rootS.y), createVector(lp.x, lp.y));
        if (d < best) { best = d; nearest = lp; }
      }
      if (nearest) {
        dirScreen = createVector(nearest.x - rootS.x, nearest.y - rootS.y);
        if (dirScreen.magSq() > 0) dirScreen.normalize();
      }
    }

    // Build an initial trunk until within MAX_DIST (pixels) of some leaf
    let current = new Branch(null, rootWorld.copy(), createVector(0, -1));
    this.branches.push(current);

    let found = false, safety = 0;
    while (!found && safety < 500) {
      const curS = worldToScreen(current.pos.x, current.pos.y);
      for (const leaf of leaves) {
        const lp = worldToScreen(leaf.pos.x, leaf.pos.y);
        const d = p5.Vector.dist(createVector(curS.x, curS.y), createVector(lp.x, lp.y));
        if (d <= MAX_DIST) { found = true; break; }
      }
      if (!found) {
        const next = current.nextFromScreenDir(dirScreen, BRANCH_LEN);
        this.branches.push(next);
        current = next;
      }
      safety++;
    }
  }

  grow() {
    // For each leaf, find closest branch within range (SCREEN space)
    for (const l of leaves) {
      let closest = null, record = Infinity;
      const lp = worldToScreen(l.pos.x, l.pos.y);
      for (const b of this.branches) {
        const bp = worldToScreen(b.pos.x, b.pos.y);
        const d = p5.Vector.dist(createVector(lp.x, lp.y), createVector(bp.x, bp.y));
        if (d < MIN_DIST) { l.reached = true; closest = null; break; }
        else if (d < record && d < MAX_DIST) { record = d; closest = b; }
      }
      if (closest && !l.reached) {
        const bp = worldToScreen(closest.pos.x, closest.pos.y);
        const v = createVector(lp.x - bp.x, lp.y - bp.y).normalize(); // SCREEN
        closest.nextDirScreen.add(v);
        closest.count++;
      }
    }

    // Grow new branches with 45° snapping (SCREEN space), step = BRANCH_LEN px
    const newBranches = [];
    for (const b of this.branches) {
      if (b.count > 0) {
        const avg = p5.Vector.div(b.nextDirScreen, b.count);
        const snapped = snapTo45DegScreen(avg);
        const next = b.nextFromScreenDir(snapped, BRANCH_LEN); // world pos computed inside
        newBranches.push(next);
        b.reset();
      }
    }
    this.branches.push(...newBranches);
  }
};

// ---- Run one growth tick; remove reached leaves ----
window.runGrowthStep = function () {
  for (const t of trees) t.grow();
  leaves = leaves.filter(l => !l.reached);
};
