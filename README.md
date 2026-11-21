# Gallery After Dark

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/xenopatijaya/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/xenopatijaya/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down 2D stealth heist in a night museum. You are **Moth**, a cat burglar
in the Vesper Gallery after closing time. Steal every glowing relic, then slip
out the green exit — unseen. Built for the
[make.fun best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759).

## How to play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080/
```

No build step, no network requests, no files beyond `game/` — plain HTML,
CSS and ES modules on a canvas, with procedural WebAudio sound.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move |
| Shift | Sneak — half speed, silent, harder to spot |
| Space / click | Throw a pebble to distract a guard |
| P / Esc | Pause |
| R | Restart level |
| M | Mute |

## The game

- **3 wings, escalating.** Level 1, The Marble Hall (2 guards, 2 relics).
  Level 2, The Sculpture Court (3 guards, 3 relics). Level 3, The Vault Wing
  (4 guards, 3 relics, plus 2 rotating security cameras).
- **Guards with vision cones.** Bram, Ida, Sol and Mara patrol fixed,
  learnable routes. Green cones patrol, yellow means a guard is suspicious
  and coming to investigate, red means you are spotted and they chase.
- **Detection with recovery.** The eye meter fills faster when you are
  close, centred in a cone, or running — slower when you sneak or stay in
  the dark. Break line of sight for a few seconds and guards calm down.
- **Cover and hiding.** Pedestals and crates block movement, hedges hide
  you unless a guard is right on top of you, and unlit floor halves how
  fast you are spotted.
- **Pebble distraction.** A thrown pebble clinks and pulls every guard in
  earshot to the noise — spend them wisely, there are only a few per wing.
- **Sound that tells you where guards are.** Guard footsteps are panned
  left/right by relative position and get louder as they close in, plus an
  alert sting, pickup chime and win/lose stingers — all synthesized in
  WebAudio, no audio files.
- **3 getaway chances.** Get caught and the wing restarts; lose all three
  and the night is over. Best times per wing are kept in localStorage.

## Files

| File | Job |
| --- | --- |
| `game/index.html` | Canvas + HUD + screens |
| `game/src/config.js` | Tuning constants |
| `game/src/random.js` | Seeded RNG |
| `game/src/levels.js` | The 3 wing layouts, patrols, relics, exits |
| `game/src/guards.js` | Guard + camera AI, vision cones, detection |
| `game/src/player.js` | Moth: movement, sneak, pebbles, pickup |
| `game/src/audio.js` | Procedural WebAudio sounds |
| `game/src/render.js` | Canvas drawing, cones, lighting |
| `game/src/shots.js` | Deterministic `?shot=` screenshot scenes |
| `game/src/main.js` | Game loop, screens, input, HUD |
| `main.ts` | Entry program: copies `game/` + `screenshots/` to `/output`, writes `dossier.json` |
| `serve.ts` | Minimal static dev server |

## Screenshots

Deterministic scenes, rendered by the game's own code:

- `1-cover.jpg` — Moth crouched behind a pedestal as a guard cone sweeps past, relic glowing, exit green.
- `2-patrol.jpg` — the Sculpture Court: every patrol route, cone and cover in view.
- `3-suspicion.jpg` — yellow cone, detection ~60%, a guard investigating a pebble.
- `4-alert.jpg` — red chase in the Vault Wing, past a sweeping camera.

## License

MIT — see [LICENSE](LICENSE).
