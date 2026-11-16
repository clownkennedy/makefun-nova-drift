# NOVA DRIFT

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/clownkennedy/makefun-nova-drift/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/clownkennedy/makefun-nova-drift/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Slingshot the dying star. Steal its light. Stay alive. NOVA DRIFT is a gravity-slingshot arcade survival game: pilot a survey ship in orbit around a dying star, ride its gravity well, catch energy orbs for score, dodge drifting asteroids, and never touch the corona — or drift into the dark. Three lives, rising levels, combo scoring, and a victory at level 5 when the star is charted.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests, just static files.

## How to play

- **Thrust** — Arrow keys / WASD, or hold the mouse (the ship thrusts toward the pointer)
- **Brake** — Space
- **Pause** — P or Esc
- **Mute** — M
- **Restart** — R (or Enter / click on the game-over screen)

Gravity always pulls you toward the star: orbit it, don't fall into it. Orbs are worth 10 points (golden nova orbs 50), chained catches build a combo multiplier up to 3x. Every 8 orbs levels you up — the asteroid field gets denser and faster. Reach level 5 to chart the star (+500 bonus) and keep flying in endless mode. Touch the corona, hit an asteroid, or drift past the outer ring and you lose a life.

## Tech

Vanilla JavaScript ES modules on a 2D canvas — no libraries, no assets, no network. Synthesized WebAudio blips (no audio files). Deterministic screenshot states via `?shot=start|play|end&seed=1`, driven by the game's own simulation and a small autopilot.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1ggdqx52&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
