// ---- Helpers ----
function mToWorld(m) { return m * WORLD_UNITS_PER_METER; }

// ---- Seeds ----
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

// ---- Assign preferred owners (nearest seed) ----
function assignPreferredOwners(leavesArr, seedsArr) {
  for (const l of leavesArr) {
    let best = Infinity, owner = -1;
    for (let i = 0; i < seedsArr.length; i++) {
      const s = seedsArr[i];
      const d = p5.Vector.dist(l.pos, createVector(s.x, s.y));
      if (d < best) { best = d; owner = i; }
    }
    l.ownerId = owner;   // preferred seed
    l.claimedBy = -1;    // none yet
  }
}

// ---- Rebuild ----
window.rebuildForestFromProjected = function () {
  trees = [];
  leaves = [];

  // Build leaves (WORLD)
  for (let i = 0; i < nodePoints.length; i++) {
    const m = nodePoints[i];
    const meta = filteredMarkers[i] || { type: "unknown", purity: "unknown" };
    leaves.push(new Leaf(m.x, m.y, meta.type, meta.purity));
  }

  // Seeds (WORLD)
  seedsWorld = getCurrentSeedWorlds();

  // Assign preferred owners
  if (leaves.length && seedsWorld.length) assignPreferredOwners(leaves, seedsWorld);

  // Build one tree per seed
  for (let i = 0; i < seedsWorld.length; i++) {
    const s = seedsWorld[i];
    trees.push(new Tree(i, createVector(s.x, s.y)));
  }
};

// ---- Snap to 45° ----
function snapTo45World(vec) {
  const step = radians(45);
  const ang = Math.atan2(vec.y, vec.x);
  const snapped = Math.round(ang / step) * step;
  const d = p5.Vector.fromAngle(snapped, 1);
  return createVector(d.x, d.y);
}

// ---- Leaf ----
window.Leaf = class {
  constructor(x, y, type, purity) {
    this.pos = createVector(x, y); // WORLD
    this.type = type;
    this.purity = purity;
    this.reached = false;
    this.ownerId = -1;   // preferred tree (static)
    this.claimedBy = -1; // dynamic owner
  }
};

// ---- Branch ----
window.Branch = class {
  constructor(parent, pos, dirWorld) {
    this.parent = parent;
    this.pos = pos;
    this.dir = dirWorld;
    this.count = 0;
    this.nextDirWorld = createVector(0, 0);
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

// ---- Tree ----
window.Tree = class {
  constructor(treeId, rootWorld) {
    this.id = treeId;
    this.branches = [];
    this.baseColor = color(`hsl(${(treeId * 360) / SEED_COUNT}, 90%, 65%)`); // bright hue per seed

    const ownLeaves = leaves.filter(l => !l.reached && l.ownerId === this.id);
    let dirW = createVector(0, -1);
    if (ownLeaves.length > 0) {
      let nearest = null, best = Infinity;
      for (const l of ownLeaves) {
        const d = p5.Vector.dist(l.pos, rootWorld);
        if (d < best) { best = d; nearest = l.pos; }
      }
      if (nearest) {
        dirW = p5.Vector.sub(nearest, rootWorld).normalize();
      }
    }

    const MAX_W = mToWorld(MAX_DIST_M);
    const STEP_W = mToWorld(BRANCH_LEN_M);

    let current = new Branch(null, rootWorld.copy(), dirW.copy());
    current.depth = 0; // root depth = 0
    this.branches.push(current);

    let found = false, safety = 0;
    while (!found && safety < 500 && ownLeaves.length > 0) {
      for (const leaf of ownLeaves) {
        const d = p5.Vector.dist(leaf.pos, current.pos);
        if (d <= MAX_W) { found = true; break; }
      }
      if (!found) {
        const next = current.nextFromWorldDir(dirW, STEP_W);
        next.depth = (current.depth ?? 0) + 1; // track depth
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

    const targetLeaves = leaves.filter(l => {
      if (l.reached) return false;
      if (l.claimedBy !== -1 && l.claimedBy !== this.id) return false;
      return l.ownerId === this.id || l.claimedBy === this.id;
    });

    for (const l of targetLeaves) {
      let closest = null, record = Infinity;
      for (const b of this.branches) {
        const d = p5.Vector.dist(l.pos, b.pos);
        if (d < MIN_W) { l.reached = true; l.claimedBy = this.id; closest = null; break; }
        else if (d < record && d < MAX_W) { record = d; closest = b; }
      }

      if (closest && l.claimedBy === -1) l.claimedBy = this.id;
      if (closest && l.claimedBy === this.id && !l.reached) {
        const v = p5.Vector.sub(l.pos, closest.pos).normalize();
        closest.nextDirWorld.add(v);
        closest.count++;
      }
    }

    const newBranches = [];
    for (const b of this.branches) {
      if (b.count > 0) {
        const avg = p5.Vector.div(b.nextDirWorld, b.count);
        const snapped = snapTo45World(avg);
        const next = b.nextFromWorldDir(snapped, STEP_W);
        next.depth = (b.depth ?? 0) + 1;
        newBranches.push(next);
        b.reset();
      }
    }
    this.branches.push(...newBranches);
  }
};

// ---- Growth Step ----
window.runGrowthStep = function () {
  for (const t of trees) t.grow();
  leaves = leaves.filter(l => !l.reached);
};
