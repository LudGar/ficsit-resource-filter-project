/* ============================
   growth.js
   Space Colonization (world-space)
   - Seeds arranged on circle around WORLD center
   - Leaves from nodePoints + filteredMarkers meta
   - Claiming is first-come-first-serve
   - NEW: Seed type assignment rule:
       * typed seed -> global target of that type (ignores region)
       * untyped seed -> region-based (ownerId nearest-seed region)
============================ */

/* globals WORLD, WORLD_UNITS_PER_METER, SEED_COUNT, SEED_RADIUS_WORLD, SEED_ROTATION_DEG */
/* globals MIN_DIST_M, MAX_DIST_M, BRANCH_LEN_M, SEED_TYPE_ASSIGNMENTS */
/* globals nodePoints, filteredMarkers */

window.trees = window.trees || [];
window.leaves = window.leaves || [];
window.seedsWorld = window.seedsWorld || [];

// ---- Helpers: meters -> world units ----
function mToWorld(m) {
  return (window.WORLD_UNITS_PER_METER || 1) * m;
}

// ---- Seeds on circle (WORLD coords) ----
function getCurrentSeedWorlds() {
  const { W, E, N, S } = WORLD;
  const cx = (W + E) / 2;
  const cy = (N + S) / 2;
  const R = SEED_RADIUS_WORLD;

  const seeds = [];
  const stepDeg = 360 / Math.max(1, SEED_COUNT);
  const offsetRad = radians(window.SEED_ROTATION_DEG || 0);

  for (let i = 0; i < SEED_COUNT; i++) {
    const a = offsetRad + radians(i * stepDeg);
    seeds.push({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  }
  return seeds;
}

// ---- Assign preferred owner (nearest seed index) ----
function assignPreferredOwners(leavesArr, seedsArr) {
  for (const l of leavesArr) {
    let best = Infinity;
    let owner = -1;
    for (let i = 0; i < seedsArr.length; i++) {
      const s = seedsArr[i];
      const d = dist(l.pos.x, l.pos.y, s.x, s.y);
      if (d < best) {
        best = d;
        owner = i;
      }
    }
    l.ownerId = owner;   // preferred by location
    l.claimedBy = -1;    // unclaimed initially
  }
}

// ---- Snap a WORLD direction to nearest 45° ----
function snapTo45World(vec) {
  const step = radians(45);
  const ang = Math.atan2(vec.y, vec.x);
  const snapped = Math.round(ang / step) * step;
  const d = p5.Vector.fromAngle(snapped, 1);
  return createVector(d.x, d.y);
}

/* ============================
   Classes
============================ */

window.Leaf = class {
  constructor(x, y, type, purity) {
    this.pos = createVector(x, y); // WORLD
    this.type = type || "unknown";
    this.purity = purity || "unknown";
    this.reached = false;

    // ownership mechanics
    this.ownerId = -1;    // nearest-seed region
    this.claimedBy = -1;  // first-come winner
  }
};

window.Branch = class {
  constructor(parent, pos, dirWorldUnit) {
    this.parent = parent;
    this.pos = pos;                 // WORLD
    this.dir = dirWorldUnit;        // WORLD unit vector
    this.count = 0;
    this.nextDirWorld = createVector(0, 0); // accumulation (WORLD)
    this.depth = 0;                 // for coloring fade
  }

  nextFromWorldDir(dirWorldUnit, stepWorld) {
    const newPos = p5.Vector.add(this.pos, p5.Vector.mult(dirWorldUnit, stepWorld));
    const newDir = p5.Vector.sub(newPos, this.pos);
    if (newDir.magSq() > 0) newDir.normalize();
    return new Branch(this, newPos, newDir);
  }

  reset() {
    this.nextDirWorld.set(0, 0);
    this.count = 0;
  }
};

window.Tree = class {
  constructor(treeId, rootWorld) {
    this.id = treeId;
    this.branches = [];

    // Used by sketch.js for per-seed coloring
    this.baseColor = color(`hsl(${(treeId * 360) / Math.max(1, SEED_COUNT)}, 90%, 65%)`);

    // Type assignment
    this.targetType = (Array.isArray(SEED_TYPE_ASSIGNMENTS) ? SEED_TYPE_ASSIGNMENTS[this.id] : null) || null;

    // Leaves used for initial direction + trunk:
    // typed seed -> global by type
    // untyped seed -> region-based
    const initLeaves = leaves.filter(l => {
      if (l.reached) return false;
      if (this.targetType) return l.type === this.targetType;
      return l.ownerId === this.id;
    });

    // Initial direction
    let dirW = createVector(0, -1);
    if (initLeaves.length > 0) {
      let nearest = null;
      let best = Infinity;
      for (const l of initLeaves) {
        const d = p5.Vector.dist(l.pos, rootWorld);
        if (d < best) {
          best = d;
          nearest = l.pos;
        }
      }
      if (nearest) {
        dirW = p5.Vector.sub(nearest, rootWorld);
        if (dirW.magSq() > 0) dirW.normalize();
      }
    }

    const MAX_W = mToWorld(MAX_DIST_M);
    const STEP_W = mToWorld(BRANCH_LEN_M);

    // Root branch
    let current = new Branch(null, rootWorld.copy(), dirW.copy());
    current.depth = 0;
    this.branches.push(current);

    // Build initial trunk until within MAX of any init leaf
    let found = false;
    let safety = 0;

    while (!found && safety < 800 && initLeaves.length > 0) {
      for (const leaf of initLeaves) {
        const d = p5.Vector.dist(leaf.pos, current.pos);
        if (d <= MAX_W) {
          found = true;
          break;
        }
      }
      if (!found) {
        const next = current.nextFromWorldDir(dirW, STEP_W);
        next.depth = (current.depth || 0) + 1;
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

    // Leaf selection rule:
    // typed seed -> global type only (ignores ownerId region)
    // untyped seed -> region-based (ownerId) or already claimed by this tree
    const targetLeaves = leaves.filter(l => {
      if (l.reached) return false;

      // If claimed by someone else, ignore
      if (l.claimedBy !== -1 && l.claimedBy !== this.id) return false;

      // Typed: global by type only
      if (this.targetType) return l.type === this.targetType;

      // Untyped: region-based
      return l.ownerId === this.id || l.claimedBy === this.id;
    });

    // Influence accumulation
    for (const l of targetLeaves) {
      let closest = null;
      let record = Infinity;

      for (const b of this.branches) {
        const d = p5.Vector.dist(l.pos, b.pos);

        // reached
        if (d < MIN_W) {
          l.reached = true;
          l.claimedBy = this.id;
          closest = null;
          break;
        }

        // candidate influencer
        if (d < record && d < MAX_W) {
          record = d;
          closest = b;
        }
      }

      // First-come claim (only if this tree is allowed to pursue it)
      if (closest && l.claimedBy === -1) {
        if (!this.targetType || l.type === this.targetType) {
          l.claimedBy = this.id;
        }
      }

      // Add attraction vector only if this tree owns the leaf now
      if (closest && l.claimedBy === this.id && !l.reached) {
        const v = p5.Vector.sub(l.pos, closest.pos);
        if (v.magSq() > 0) v.normalize();
        closest.nextDirWorld.add(v);
        closest.count++;
      }
    }

    // Create new branches (45° snapped)
    const newBranches = [];
    for (const b of this.branches) {
      if (b.count > 0) {
        const avg = p5.Vector.div(b.nextDirWorld, b.count);
        const snapped = snapTo45World(avg);
        const next = b.nextFromWorldDir(snapped, STEP_W);
        next.depth = (b.depth || 0) + 1;
        newBranches.push(next);
        b.reset();
      }
    }

    this.branches.push(...newBranches);
  }
};

/* ============================
   Rebuild forest from nodePoints
============================ */

window.rebuildForestFromProjected = function () {
  trees = [];
  leaves = [];
  seedsWorld = [];

  if (!window.WORLD || !Array.isArray(nodePoints)) {
    console.warn("[Growth] Missing WORLD or nodePoints");
    return;
  }

  // Create leaves from nodePoints + meta
  for (let i = 0; i < nodePoints.length; i++) {
    const p = nodePoints[i];
    const meta = (Array.isArray(filteredMarkers) && filteredMarkers[i]) ? filteredMarkers[i] : null;
    const type = meta ? meta.type : "unknown";
    const purity = meta ? meta.purity : "unknown";
    leaves.push(new Leaf(p.x, p.y, type, purity));
  }

  // Seeds
  seedsWorld = getCurrentSeedWorlds();

  // Ensure assignments array fits seed count
  if (!Array.isArray(SEED_TYPE_ASSIGNMENTS)) window.SEED_TYPE_ASSIGNMENTS = [];
  while (SEED_TYPE_ASSIGNMENTS.length < SEED_COUNT) SEED_TYPE_ASSIGNMENTS.push(null);
  if (SEED_TYPE_ASSIGNMENTS.length > SEED_COUNT) SEED_TYPE_ASSIGNMENTS.length = SEED_COUNT;

  // Preferred ownership (nearest seed) still computed for untyped behavior
  if (leaves.length && seedsWorld.length) assignPreferredOwners(leaves, seedsWorld);

  // Build trees
  for (let i = 0; i < seedsWorld.length; i++) {
    const s = seedsWorld[i];
    trees.push(new Tree(i, createVector(s.x, s.y)));
  }

  console.log(`[Growth] Rebuilt: seeds=${trees.length}, leaves=${leaves.length}`);
};

/* ============================
   One simulation step
============================ */

window.runGrowthStep = function () {
  if (!trees || trees.length === 0) return;

  for (const t of trees) t.grow();

  // Remove reached leaves
  leaves = leaves.filter(l => !l.reached);

  // Optional: stop automatically if nothing left to chase
  if (leaves.length === 0 && typeof window.simulationRunning === "boolean") {
    window.simulationRunning = false;
  }
};
