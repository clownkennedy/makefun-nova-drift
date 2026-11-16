# NOVA DRIFT — build log (best-game-01)

Built 16 Nov 2026 by build subagent session cf813907-f28f-4430-9369-6220eb3bf95b
(for parent: bundle with --no-discover --session /home/hatch/agents/agent-cf813907-f28f-4430-9369-6220eb3bf95b/sessions/cf813907-f28f-4430-9369-6220eb3bf95b.jsonl)

## What it is

NOVA DRIFT — a gravity-slingshot arcade survival game. Pilot a survey ship in
orbit around a dying star: gravity pulls you in, thrust (arrows/WASD or mouse
hold) keeps you orbiting, brake with Space. Catch energy orbs (+10, golden
nova orbs +50, combo multiplier up to 3x), dodge asteroids, never touch the
corona and never drift past the outer ring. 3 lives, level up every 8 orbs
(denser/faster asteroids), victory at level 5 (+500, endless mode after),
game over with final score + best + restart (R / Enter / click). Pause (P),
mute (M). WebAudio synth blips, no audio files. Vanilla JS ES modules on a
2D canvas — no libraries, no assets, no network requests.

## Competition (verified live 16 Nov 2026)

- best-game-01 "Make the best game", $1,000 escrowed (1st $400 / 2nd $200 /
  3rd $120 / 4th–10th $40), entries close 2026-11-18T18:00:00Z (= 19 Nov
  01:00 WIB). Requirements JSON saved at
  ~/workspace/makefun-kit/bestgame-requirements.json; kit downloaded from
  https://make.fun/c/best-game-01/kit to
  ~/workspace/makefun-kit/best-game-01-kit/best-game-01-kit/.
- Deliverables: public GitHub repo (created after the competition opens),
  OSI license, main.ts in root, vendor/makefun-game.ts copied unchanged,
  game/ static files, 3–4 screenshots, agent transcripts.
- Gate caps (verified): game/ ≤993 files and ≤48 MiB, index.html ≤1 MiB,
  screenshots 3–4 each ≤256 KiB, long side ≤1280, short side ≥480,
  dossier ≤1.5 MiB, dossier text ≤163,840 bytes.

## Files (~/workspace/makefun-best-game/, 17 files, 268 KB)

- main.ts (kit program, copies game/+screenshots/ to /output, writes
  dossier.json via vendor/makefun-game.ts buildDossier), serve.ts (kit
  static server, :8080), shots.json, LICENSE (MIT, kit's), README.md,
  .makefun/owner.json (wallet 63T8hDszaYhRPuUWXdCctuCy5icDHWswjShi6dKzJb2X)
- vendor/makefun-game.ts — kit's file, sha256 verified identical to the kit
- game/index.html + game/src/{main,world,render,input,audio,config,random,shots}.js
  (all original code written in this session; the starter game "Block Dodger"
  was NOT reused — only the kit's main.ts/serve.ts/LICENSE/vendor scaffolding)
- screenshots/1-start.jpg (68,787 B), 2-play.jpg (38,887 B),
  3-end.jpg (50,157 B) — 1280x720 JPEG quality 88, real renders of the
  game's own code via ?shot=start|play|end&seed=1 (seeded RNG + autopilot)

## Verification done

- Node v24.22.1; all game JS passes `node --check`.
- Served with `node serve.ts`, index + main.js return HTTP 200.
- Screenshots via Playwright chromium_headless_shell (1280x720,
  --virtual-time-budget=3000), visually inspected: title (star visible,
  instructions, launch prompt), play (SCORE 60, +50 popup, engine trail,
  HUD lives/level), end (RUN OVER 233, Level 2, 10 orbs, cause, NEW BEST,
  restart prompt).
- Headless logic smoke test (Node, seeded): 4 seeds play to game over or
  victory — scores 249–1364, deaths by corona/asteroid/lost all occur,
  level-ups work, victory at level 5 works (seed 42: score 1364, 40 orbs).
  Shot states verified: start=title, play=playing score 60, end=over.
- `MAKEFUN_OUTPUT_DIR=/tmp/nova-out node main.ts` builds dossier.json
  (259,212 B, text 46,769 B, 3 images, schema makefun/dossier/v1). game/
  is 9 files / 46,111 B. No secrets in the tree (grep clean).

## Notes for the parent (repo + submit)

- README badges + About assume repo `clownkennedy/makefun-nova-drift`
  (same naming pattern as makefun-chess-4kb / makefun-threejs-fps-02). If
  the repo name differs, update the badge URLs in README.md before submit.
- Repo must be created AFTER the competition opened (it opened 15 Nov, so
  any new repo now is fine) and must be public under clownkennedy.
- The game was built entirely in this session; bundle this session's file
  (see header) for the transcripts.
- Not done here (parent's job): GitHub repo creation, bundle, check,
  submit.
