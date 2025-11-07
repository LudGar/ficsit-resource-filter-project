// ---- Helpers to convert meters ↔ world units ----
function mToWorld(m) { return m * WORLD_UNITS_PER_METER; }

// ---- Seeds: SEED_COUNT around world center, evenly spaced (world coords) ----
function getCurrentSeedWorlds() {
  const { W, E, N, S } = WORLD;
  const cx = (W + E) / 2, cy = (N + S) / 2;
  const R = SEED_RADIUS_WORLD;
  const seeds = [];
  const stepDeg = 360 / Math.max(1, SEED_COUNT);
  for (let i = 0; i < SEED_COUNT; i++) {
    const a = radians(i * stepDeg);
    seeds.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  }
  return seeds;
}

// ---- Assign each leaf to nearest seed (ownerId) ----
function assignLeafOwnership(leavesArr, seedsArr) {
  for (const leaf of leavesArr) {
    let best = Infinity, owner = -1;
    for (let i = 0; i < seedsArr.length; i++) {
      const s = seedsArr[i];
      const d = p5.Vector.dist(leaf.pos, createVector(s.x, s.y));
      if (d < best) { best = d; owner = i; }
    }
    leaf.ownerId = owner;
  }
}

// ---- Rebuild forest from current nodePoints (WORLD) & seeds (WORLD) ----
window.rebuildForestFromProjected = function () {
  trees = [];
  leaves = [];

  // Build leaves in WORLD
  for (let i = 0; i < nodePoints.length; i++) {
    const m = nodePoints[i];
    const meta = filteredMarkers[i] || { type: "unknown", purity: "unknown" };
    leaves.push(new Leaf(m.x, m.y, meta.type, meta.purity));
  }

  // Seeds in WORLD
  seedsWorld = getCurrentSeedWorlds();

  // Partition leaves by nearest seed (ownerId)
  if (leaves.length && seedsWorld.length) assignLeafOwnership(leaves, seedsWorld);

  // Build one tree per seed, passing its treeId
  for (let i = 0; i < seedsWorld.length; i++) {
    const s = seedsWorld[i];
    trees.push(new Tree(i, createVector(s.x, s.y)));
  }
};

// ---- Snap a WORLD vector to the nearest 45° (world axes) ----
function snapTo45World(vec) {
  const step = radians(45);
  const ang = Math.atan2(vec.y, vec.x);
  const snapped = Math.round(ang / step) * step;
  const d = p5.Vector.fromAngle(snapped, 1);
  return createVector(d.x, d.y);
}

// ---- Leaf (WORLD) ----
window.Leaf = class {
  constructor(x, y, type, purity) {
    this.pos = createVector(x, y); // WORLD
    this.type = type;
    this.purity = purity;
    this.reached = false;
    this.ownerId = -1;            // set by assignLeafOwnership
  }
};

// ---- Branch (WORLD) ----
window.Branch = class {
  constructor(parent, pos, dirWorld) {
    this.parent = parent;
    this.pos = pos;          // WORLD
    this.dir = dirWorld;     // WORLD unit direction
    this.count = 0;
    this.nextDirWorld = createVector(0, 0); // accumulate in WORLD space
  }

  nextFromWorldDir(dirWorldUnit, stepWorld) {
    const newPosW = p5.Vector.add(this.pos, p5.Vector.mult(dirWorldUnit, stepWorld));
    const dirW = p5.Vector.sub(newPosW, this.pos);
    if (dirW.magSq() > 0) dirW.normalize();
    return new Branch(this, newPosW, dirW);
  }

  reset() {
    this.nextDirWorld.set(0, 0);
    this.count = 0;
  }
};

// ---- Tree (WORLD) that only considers its OWN leaves ----
window.Tree = class {
  constructor(treeId, rootWorld) {
    this.id = treeId;            // owner id
    this.branches = [];

    // Initial direction toward nearest OWN leaf (WORLD)
    let dirW = createVector(0, -1);
    const ownLeaves = leaves.filter(l => !l.reached && l.ownerId === this.id);
    if (ownLeaves.length > 0) {
      let nearest = null, best = Infinity;
      for (const l of ownLeaves) {
        const d = p5.Vector.dist(l.pos, rootWorld);
        if (d < best) { best = d; nearest = l.pos; }
      }
      if (nearest) {
        dirW = p5.Vector.sub(nearest, rootWorld);
        if (dirW.magSq() > 0) dirW.normalize();
      }
    }

    // Build initial trunk until within MAX_DIST_M (WORLD) of some OWN leaf
    const MAX_W = mToWorld(MAX_DIST_M);
    const STEP_W = mToWorld(BRANCH_LEN_M);

    let current = new Branch(null, rootWorld.copy(), dirW.copy());
    this.branches.push(current);

    let found = false, safety = 0;
    while (!found && safety < 500 && ownLeaves.length > 0) {
      for (const leaf of ownLeaves) {
        const d = p5.Vector.dist(leaf.pos, current.pos);
        if (d <= MAX_W) { found = true; break; }
      }
      if (!found) {
        const next = current.nextFromWorldDir(dirW, STEP_W);
        this.branches.push(next);
        current = next;
      }
      safety++;
    }
  }

  grow() {
    const MIN_W = mToWorld(MIN_DIST_M);
    const MAX_W = mToWorld(MAX_DIST_M);
    const STEP_W = mToWorld(BRANCH_LEN_M);

    // Only consider OWN leaves
    const ownLeaves = leaves.filter(l => !l.reached && l.ownerId === this.id);

    for (const l of ownLeaves) {
      let closest = null, record = Infinity;
      for (const b of this.branches) {
        const d = p5.Vector.dist(l.pos, b.pos);
        if (d < MIN_W) { l.reached = true; closest = null; break; }
        else if (d < record && d < MAX_W) { record = d; closest = b; }
      }
      if (closest && !l.reached) {
        const v = p5.Vector.sub(l.pos, closest.pos).normalize(); // WORLD
        closest.nextDirWorld.add(v);
        closest.count++;
      }
    }

    // Grow new branches with 45° snapping (WORLD)
    const newBranches = [];
    for (const b of this.branches) {
      if (b.count > 0) {
        const avg = p5.Vector.div(b.nextDirWorld, b.count);
        const snapped = snapTo45World(avg);
        const next = b.nextFromWorldDir(snapped, STEP_W);
        newBranches.push(next);
        b.reset();
      }
    }
    this.branches.push(...newBranches);
  }
};

// ---- One growth tick; remove reached leaves ----
window.runGrowthStep = function () {
  for (const t of trees) t.grow();
  leaves = leaves.filter(l => !l.reached);
};
