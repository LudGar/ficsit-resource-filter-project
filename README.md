# Space Colonization – Resource Network Explorer

A browser-based visualization tool built with **p5.js** that explores **resource node networks** using a **space colonization growth algorithm**, inspired by procedural tree growth and logistics layouts.

The app loads real in-game resource node data, visualizes it in world space, and grows branching networks from configurable seed points toward those nodes. It is designed as an **experimental, interactive sandbox** for studying spatial distribution, attraction rules, and growth constraints.

---

## ✨ Core Features

### 🌍 World-Space Visualization
- World-aligned camera with **pan / zoom / fit**
- Real map background assembled from **4 tiled images**
- Blueprint-style world grid (zoom-aware, performance-optimized)
- Toggleable origin logic (game 0,0 vs world center)

### 🌱 Space Colonization Growth
- Multiple **seed points** arranged on a configurable circle
- Each seed grows an independent **tree network**
- Growth uses a classic **space colonization algorithm**:
  - Nodes act as attraction points
  - Branches grow toward nearby nodes
  - Nodes are consumed once reached
- Growth direction snapped to **45° increments**
- Growth halts automatically when no nodes remain

### 🎯 Seed Targeting Logic
- Seeds can be:
  - **Untyped** → grow only within their nearest-seed region
  - **Type-assigned** → grow globally toward nodes of that type
- First-come-first-serve claiming prevents duplicate growth toward the same node
- All nodes remain visible even after being consumed

### 🧱 Physical Scale Awareness
- Branch thickness is rendered at **real-world scale**
  - Matches the in-game conveyor belt width (**2 meters**)
  - Scales correctly with camera zoom
- Distances (min / max / branch length) are defined in **meters**

### 🧭 Debug & Inspection Tools
- Mouse position displayed in **world coordinates**
- Hover tooltip for nodes (type, purity, exact position)
- Static overlay of all nodes (type color + purity shape)
- Seed radius and seed positions rendered in-world

---

## 📦 Data Format

The app expects a `nodes.json` file structured similarly to:

- Resource nodes grouped by type and purity
- Each node providing at least:
  - `x`, `y` (world coordinates)
  - `type` (e.g. limestone, iron, copper)
  - `purity` (impure / normal / pure)

This project was designed around real in-game data but can be adapted to other spatial datasets.

---

## 🕹️ Controls

- **Mouse drag** – Pan camera
- **Mouse wheel** – Zoom
- **Double click** – Fit world to view
- **Hover node** – Show tooltip
- **UI panel** – Configure seeds, distances, growth behavior

---

## 🚧 Current Scope & Intent

This project is **not**:
- A finished game
- A production logistics planner
- A finalized simulation

It **is**:
- A research & visualization sandbox
- A foundation for experimenting with spatial growth rules
- A base for future expansion into analysis, export, or gameplay systems

---

## 🧠 Inspiration

- Space Colonization Algorithm (Runions et al.)
- Procedural tree and vein growth
- Logistics games and world-scale resource planning
- Blueprint-style technical visualization

---

## 🛠️ Tech Stack

- **p5.js** (rendering, input, math)
- Vanilla JavaScript (no build step)
- HTML / CSS (custom UI styling)

---

## 📈 Roadmap (Open-Ended)

This repository is intentionally flexible. Possible future directions include:
- Exporting networks (SVG / GeoJSON)
- Cost / flow simulation along branches
- Constraint-based routing (terrain, obstacles)
- Time-based or staged growth
- Integration with other game or map datasets

The scope is expected to evolve.

---

If you’re reading this as future-you:  
Yes, it grew bigger than planned — and that’s fine.
