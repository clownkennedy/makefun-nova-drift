// Deterministic screenshot states, driven by ?shot=<name>&seed=<n>.
// Each state is built by the game's own code paths (spawn functions, the
// fixed-step simulation, a small autopilot) so every screenshot is a real
// render of the game, never a staged mock.
import { STATES, startGame, step } from './world.js';
import { CONFIG as C } from './config.js';

// A simple autopilot: thrust toward the nearest orb, with a tangential bias
// so the ship keeps orbiting instead of diving straight at the star.
function autopilotInput(world) {
  const ship = world.ship;
  let best = null;
  let bestD = Infinity;
  for (const o of world.orbs) {
    const dx = o.x - ship.x;
    const dy = o.y - ship.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  if (!best) return { up: false, down: false, left: false, right: false, brake: false, pointer: null };
  // Desired direction: toward the orb, blended with the orbital tangent so
  // the ship curves around the star instead of falling into it.
  const dx = best.x - ship.x;
  const dy = best.y - ship.y;
  const d = Math.hypot(dx, dy) || 1;
  const sx = world.star.x - ship.x;
  const sy = world.star.y - ship.y;
  const sd = Math.hypot(sx, sy) || 1;
  // Tangent (counter-clockwise) around the star.
  const tx = -sy / sd;
  const ty = sx / sd;
  let mx = dx / d + tx * 0.3;
  let my = dy / d + ty * 0.3;
  if (d < 150) {
    // Close in: pure pursuit, no orbital tangent.
    mx = dx / d;
    my = dy / d;
  }
  const m = Math.hypot(mx, my) || 1;
  mx /= m;
  my /= m;
  return {
    up: my < -0.3,
    down: my > 0.3,
    left: mx < -0.3,
    right: mx > 0.3,
    brake: false,
    pointer: null,
  };
}

function simulate(world, seconds, autopilot) {
  const dt = 1 / 60;
  const steps = Math.floor(seconds / dt);
  for (let i = 0; i < steps; i++) {
    if (world.state !== STATES.PLAYING) break;
    step(world, autopilot ? autopilotInput(world) : { up: false, down: false, left: false, right: false, brake: false, pointer: null }, dt);
  }
}

// Apply a ?shot= state to a fresh world. Returns true when a shot was set.
export function applyShot(world, name, seed) {
  if (name === 'start') {
    // Title screen over a live, drifting field.
    world.state = STATES.TITLE;
    return true;
  }
  if (name === 'play') {
    startGame(world);
    // Seed one orb right ahead of the ship on its orbital path so the run
    // scores quickly, then let the autopilot play.
    const ship = world.ship;
    const sp = Math.hypot(ship.vx, ship.vy) || 1;
    world.orbs.push({
      x: ship.x + (ship.vx / sp) * 150,
      y: ship.y + (ship.vy / sp) * 150,
      radius: C.orbRadius,
      golden: false,
      phase: 0,
      pulse: 0,
    });
    simulate(world, 10, true);
    // If the run somehow still has not scored, give the autopilot more time.
    if (world.state === STATES.PLAYING && world.score === 0) simulate(world, 10, true);
    if (world.state !== STATES.PLAYING) {
      // Autopilot died early (unlucky seed): restart once and simulate less.
      startGame(world);
      simulate(world, 5, true);
    }
    return true;
  }
  if (name === 'end') {
    startGame(world);
    // Let the autopilot fly until the run ends. It plays greedily and dies:
    // gravity + asteroids do the rest. Cap the simulation so the shot never
    // hangs; if the ship is somehow still alive, one real collision ends it
    // through the same code path as a live death.
    let guard = 0;
    while (world.state === STATES.PLAYING && guard < 90 * 60) {
      step(world, autopilotInput(world), 1 / 60);
      guard++;
    }
    if (world.state === STATES.PLAYING) {
      const a = world.asteroids[0];
      if (a) {
        a.x = world.ship.x;
        a.y = world.ship.y;
        a.vx = 0;
        a.vy = 0;
        world.ship.invuln = 0;
        world.lives = 1;
        step(world, { up: false, down: false, left: false, right: false, brake: false, pointer: null }, 1 / 60);
      }
    }
    // Let the explosion particles settle a touch so the panel reads clean.
    for (let i = 0; i < 30; i++) step(world, { up: false, down: false, left: false, right: false, brake: false, pointer: null }, 1 / 60);
    return true;
  }
  return false;
}

export { C };
