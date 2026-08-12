
# Multiverse Puzzles

Just complete simple tasks on a small grid... In every universe

# Core idea

A grid-based puzzle game where every player action happens simultaneously across multiple parallel universes.
Certain objects can exist in different positions or behave differently in each universe.
The goal is to find a single sequence of inputs that solves the puzzle across all active universes.

# Parallel Universes

A game state consists of multiple universes, each with its own copy of the board state.
Player inputs are applied to every universe simultaneously.

For example, a box might occupy nine different positions across a 3×3 set of universes.
The player must manipulate the box so that all nine copies eventually reach the goal.

# Divergence & Convergence

Universes can diverge when an action has different results in different realities.
For example, a wall that exists in one universe but not another can cause the player to end up in different positions.

This creates a central puzzle mechanic: intentionally create divergence, then find a way to bring the resulting states back together.
As the game progresses, the number of distinct states may increase, potentially causing the screen to split into multiple views of the different realities.

# Tech Stack

Vite, React, Typescript, Tailwindcss, Pixi.js
Local storage for now
