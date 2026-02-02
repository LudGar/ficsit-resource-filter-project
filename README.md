🌿 Space Colonization – World-Scale Growth Visualizer

A browser-based visualization tool for world-scale growth algorithms, inspired by space colonization, resource networks, and game-map analysis.

This project uses real game world coordinates (e.g. from Satisfactory) to grow branching networks from configurable seeds toward resource nodes, with strict spatial rules, ownership, and first-come claiming.

✨ What this project is

A p5.js web app (no build step, no framework)

A world-space visualization tool, not just a sketch

A growth simulator, not a static renderer

A debug / analysis aid for large coordinate maps

It is designed to:

Load thousands of real-world nodes from JSON

Visualize them on an actual game map

Grow branching structures toward them under clear rules

Let you experiment with spatial strategies and constraints

🧠 Core Concepts
Space Colonization (Growth Algorithm)

Branches grow toward nearby “leaves” (nodes):

Leaves attract nearby branch tips

Branches grow in discrete steps

Leaves are removed once reached

Growth stops when no leaves remain

Seeds (Tree Roots)

Multiple seeds are placed in a circle around the world

Each seed creates its own independent tree

Seeds can optionally be assigned a resource type

Assigned → global targeting of that type

Unassigned → region-based targeting (nearest-seed region)

First-Come-First-Serve Claiming

Once a tree gets close enough to a node, it claims it

Other trees ignore claimed nodes

Prevents redundant or overlapping growth

🗺️ World Space & Camera

All coordinates are world coordinates, not canvas coordinates

Supports:

Pan (drag)

Zoom (mouse wheel, zoom-to-cursor)

Fit world to window (double-click)

Grid, map, nodes, seeds, and branches are all world-locked

🧱 Visualization Layers

Rendered bottom → top:

Game Map Layer

4 tiled images aligned to world bounds

Blueprint Grid

Dot + major line grid in world space

Seed Layer

Seed positions

Seed radius circle

Voronoi Overlay (optional)

Region partitioning

Growth (Branches)

Branch width = real conveyor belt width (2m)

Color fades with distance

Node Overlay

All nodes always visible

Shape by purity:

Impure → Circle

Normal → Triangle

Pure → Hexagon

HUD & Tooltips

Mouse world coordinates

Node hover tooltip (type, purity, position)

🎛️ UI Features

Movable, Windows-11-style glass panel

Controls for:

Seed count

Seed radius (meters)

Seed rotation (degrees)

Per-seed resource type assignment

Start / Reset growth

Live inspection without restarting the app

📁 Project Structure
/
├─ index.html          # App shell
├─ styles.css          # UI + visual styling
├─ nodes.json          # World node data (external)
├─ img/
│  ├─ Map_0-0.png
│  ├─ Map_0-1.png
│  ├─ Map_1-0.png
│  └─ Map_1-1.png
└─ js/
   ├─ config.js        # Global constants & settings
   ├─ data.js          # JSON parsing & node handling
   ├─ growth.js        # Space colonization algorithm
   ├─ ui.js            # UI creation & bindings
   └─ sketch.js        # Rendering, camera, interaction


No bundler, no transpiler, no server required.

🚀 Running the Project

Because the app loads JSON and images, you must use a local server.

Examples:

# Python
python -m http.server 8080

# Node
npx serve .

# VS Code
Live Server extension


Then open:

http://localhost:8080

🎯 Intended Use Cases

Analyze resource layouts on large game maps

Prototype logistics / network growth strategies

Explore spatial partitioning problems

Visualize ownership, reach, and distance

Experiment with procedural growth constraints

This is not a finished game mechanic — it’s a tool for thinking spatially.

🔧 Current Limitations

No persistence (reload resets state)

No export yet (SVG / JSON planned)

Growth is CPU-bound for very large node counts

One growth model (space colonization) for now

🧭 Roadmap (High-Level)

This is intentionally open-ended, but likely directions include:

Export growth paths (SVG / GeoJSON)

Alternative growth models

Hard trunk vs flexible branch modes

Cost / distance weighting

Simulation replay & step controls

Layer toggles & legends
