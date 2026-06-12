<div align="center">

<img src="public/favicon.svg" width="88" height="88" alt="Velocitype logo" />

# Velocitype

**Type at the speed of light.**

A typing arcade with five distinct game modes. Five games. One keyboard.
How fast are you *really*?

</div>

---

## Overview

Velocitype turns the classic typing test into an arcade. Every mode measures the
same two things — **speed (WPM)** and **accuracy** — but wraps them in a different
challenge, from a calm 3D night drive to a rage-fueled boss fight. Records are kept
locally, per mode and per difficulty, so there's always a number to beat.

## Modes

| # | Mode | What it is |
|---|------|-----------|
| 01 | **Classic** | The timeless test — pure speed, pure accuracy. |
| 02 | **Night Drive** | Your typing is the throttle. Stop typing and the engine dies. A 3D drive through the dark. |
| 03 | **Boss Fight** | A yeti in the woods — out-type its rising rage before it overwhelms you. |
| 04 | **Ghost Text** | The sentence turns to dust as you go — finish it from memory. |
| 05 | **Code** | Real snippets with real syntax. Choose from **JavaScript**, **Python**, **Go**, or **CSS**. |

Each mode runs at one of three difficulties — **easy**, **medium**, or **hard**.

## Tech stack

- **[React 19](https://react.dev/)** + **[TypeScript](https://www.typescriptlang.org/)**
- **[Vite 6](https://vite.dev/)** for dev server and bundling
- **[Tailwind CSS 4](https://tailwindcss.com/)** for styling
- **[Three.js](https://threejs.org/)** via **[@react-three/fiber](https://github.com/pmndrs/react-three-fiber)** and **[@react-three/drei](https://github.com/pmndrs/drei)** for the 3D modes (Night Drive, Boss Fight)
- **localStorage** for high scores — no backend, nothing leaves the browser

## Getting started

Requires [Node.js](https://nodejs.org/) 18+.

```bash
# install dependencies
npm install

# start the dev server (http://localhost:5173)
npm run dev

# type-check and build for production into dist/
npm run build

# preview the production build locally
npm run preview
```

## Project structure

```
.
├── index.html               # entry HTML + SEO/social meta
├── public/
│   ├── favicon.svg          # app icon + generated PNG variants
│   ├── og.png               # social share image
│   ├── site.webmanifest     # PWA manifest
│   └── models/              # .glb assets (car, pines, yeti)
└── src/
    ├── App.tsx              # screen routing: menu → playing → results
    ├── components/
    │   ├── MainMenu.tsx     # mode index + difficulty/sound controls
    │   ├── Game.tsx         # active-mode host
    │   ├── ResultsScreen.tsx
    │   ├── modes/           # one component per game mode
    │   ├── three/           # 3D scenes (RaceTrack, BossScene)
    │   └── typing/          # shared typing engine + text display
    └── lib/
        ├── words.ts         # word lists
        ├── code.ts          # code snippets per language
        ├── scoring.ts       # WPM / accuracy math
        ├── storage.ts       # per-mode high scores (localStorage)
        ├── sfx.ts           # sound effects
        └── types.ts         # shared types
```

## Scoring

- **WPM** is net words per minute from correctly typed characters (the standard
  5 characters = 1 word).
- **Accuracy** is correct keystrokes over total keystrokes.
- A single per-mode **score** drives the leaderboard; a result only overwrites the
  stored best when it beats it, keyed by `mode:difficulty`.

## Notes

- **Desktop and a physical keyboard are required** — the game is built around real key input.
- All progress lives in your browser's local storage; clearing site data resets your records.
- Live at **[velocitype.xyz](https://velocitype.xyz/)**.

## License

This project is private. All rights reserved.
