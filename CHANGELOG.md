# mp-pong-2020

## 1.1.0

### Minor Changes

- [`a7e859f`](https://github.com/GadDev/mp-pong-2020/commit/a7e859fbffc5698be073aaa88b28aa0d7907f4a4) Thanks [@GadDev](https://github.com/GadDev)! - Replace the vanilla-JS game with a Vite + TypeScript + Three.js project skeleton (Milestone 0): `npm run dev` renders a rotating placeholder cube, `npm run build` produces a static bundle. Adds ESLint/Prettier and Vitest tooling per TECHSTACK.md.

- [`d1fcf1d`](https://github.com/GadDev/mp-pong-2020/commit/d1fcf1def193d9f7be5edc4df68aa673b14c2eb9) Thanks [@GadDev](https://github.com/GadDev)! - Milestone 1: reveal spike. Dummy court geometry (grid, two blocks, a dot) runs through a debug-key or scripted (`P`) Act I -> II -> III sequence: fixed Tron-style camera -> slow imperceptible pull-back with micro-drift -> orbital Blade Runner camera with a jarring watcher cut, with HUD text/color and a procedural ambient-audio bed shifting in lockstep. Camera/HUD/audio pacing is not final — this proves the reveal can land, not the production polish (Milestone 5).

## 1.0.2

### Patch Changes

- [`4c9817b`](https://github.com/GadDev/mp-pong-2020/commit/4c9817b6299aa3770ac2496f0ad0cb9df3042ca4) Thanks [@GadDev](https://github.com/GadDev)! - Fix GitHub Releases not being created: bump changesets/action to v2, which reads the CLI's structured CHANGESETS_OUTPUT instead of parsing stdout in a format the installed @changesets/cli no longer produces.

## 1.0.1

### Patch Changes

- [`d877b00`](https://github.com/GadDev/mp-pong-2020/commit/d877b0059651997f214d4021924f51b9ff80f2f0) Thanks [@GadDev](https://github.com/GadDev)! - Add npm project setup, Changesets versioning, and a GitHub Actions release workflow.
