// NOVA DRIFT — world state and the fixed-step simulation.
// Everything the game is lives here: the ship, the star's gravity, asteroids,
// orbs, particles and the score/level/lives rules. Rendering reads this state;
// it never mutates it. Deterministic when constructed with a seeded rng.
import { CONFIG as C } from './config.js';
import { clamp, dist2, mulberry32, range } from './random.js';

export const STATES = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  OVER: 'over',
};

export function createWorld(w, h, seed) {
  const rng = seed === undefined ? Math.random : mulberry32(seed);
  const star = { x: w * C.starX, y: h * C.starY };
  // Escape radius scales with the smaller viewport side so the playfield
  // stays fair on any window size.
  const escapeR = Math.min(w, h) * 0.78;

  const world = {
    w,
    h,
    rng,
    star,
    escapeR,
    time: 0,
    state: STATES.TITLE,
    score: 0,
    best: 0,
    lives: C.lives,
    level: 1,
    orbsCollected: 0, // orbs collected on the current level
    totalCollected: 0,
    combo: 0,
    comboTimer: 0,
    victoryShown: false,
    endless: false,
    shake: 0,
    flash: 0, // white flash 0..1 after a death
    banner: null, // {text, sub, t} transient centre banner
    bannerT: 0,
    ship: null,
    asteroids: [],
    orbs: [],
    particles: [],
    popups: [], // floating score texts {x, y, text, t, color}
    deathCause: null, // 'corona' | 'asteroid' | 'lost'
    muted: false,
    events: [], // sound/event queue drained by main.js each step: 'pickup'|'nova'|'explosion'|'level'|'victory'
  };

  try {
    world.best = Number(localStorage.getItem('nova-drift-best') || 0) || 0;
  } catch {
    world.best = 0;
  }

  resetShip(world, true);
  spawnInitial(world);
  return world;
}

function resetShip(world, first = false) {
  // Park the ship on a stable circular orbit: far enough from the corona,
  // moving tangentially at roughly orbital speed.
  const r = 235;
  const a = -Math.PI / 2 + (first ? 0.6 : world.rng() * Math.PI * 2);
  const speed = Math.sqrt(C.gravity / r) * 0.98;
  world.ship = {
    x: world.star.x + Math.cos(a) * r,
    y: world.star.y + Math.sin(a) * r,
    vx: -Math.sin(a) * speed,
    vy: Math.cos(a) * speed,
    angle: a + Math.PI / 2,
    thrusting: false,
    invuln: first ? 0 : C.respawnInvuln,
    trail: 0,
  };
}

function spawnInitial(world) {
  world.asteroids = [];
  world.orbs = [];
  const n = C.asteroidBase + (world.level - 1) * C.asteroidPerLevel;
  for (let i = 0; i < Math.min(n, C.asteroidMax); i++) spawnAsteroid(world);
  while (world.orbs.length < C.orbsTarget) spawnOrb(world);
}

export function spawnAsteroid(world, farFromShip = true) {
  const rng = world.rng;
  // Spawn on a ring around the star, outside the corona, inside the escape
  // radius; keep a little distance from the ship so nothing spawns on it.
  for (let tries = 0; tries < 12; tries++) {
    const a = rng() * Math.PI * 2;
    const r = range(rng, 150, world.escapeR - 40);
    const x = world.star.x + Math.cos(a) * r;
    const y = world.star.y + Math.sin(a) * r;
    if (x < 20 || x > world.w - 20 || y < 20 || y > world.h - 20) continue;
    if (farFromShip && world.ship && dist2(x, y, world.ship.x, world.ship.y) < 120 * 120) continue;
    const radius = range(rng, C.asteroidRadiusMin, C.asteroidRadiusMax);
    // Roughly orbital drift + a random kick, so the field feels alive.
    const tangent = Math.sqrt(C.gravity / Math.max(r, 120)) * range(rng, 0.35, 0.8);
    const dir = rng() < 0.5 ? 1 : -1;
    const verts = [];
    const n = 7 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) verts.push(range(rng, 0.72, 1.18));
    world.asteroids.push({
      x,
      y,
      vx: -Math.sin(a) * tangent * dir + range(rng, -14, 14),
      vy: Math.cos(a) * tangent * dir + range(rng, -14, 14),
      radius,
      rot: rng() * Math.PI * 2,
      rotSpeed: range(rng, -0.9, 0.9),
      verts,
      shade: range(rng, 0.55, 0.9),
    });
    return;
  }
}

export function spawnOrb(world) {
  const rng = world.rng;
  const golden = rng() < C.novaOrbChance;
  for (let tries = 0; tries < 12; tries++) {
    const a = rng() * Math.PI * 2;
    const r = range(rng, 130, world.escapeR - 60);
    const x = world.star.x + Math.cos(a) * r;
    const y = world.star.y + Math.sin(a) * r;
    if (x < 30 || x > world.w - 30 || y < 30 || y > world.h - 30) continue;
    // Not inside the corona, not on top of an asteroid.
    if (dist2(x, y, world.star.x, world.star.y) < (C.coronaRadius + 26) ** 2) continue;
    if (world.asteroids.some((o) => dist2(x, y, o.x, o.y) < (o.radius + 26) ** 2)) continue;
    world.orbs.push({
      x,
      y,
      radius: C.orbRadius,
      golden,
      phase: rng() * Math.PI * 2,
      pulse: 0,
    });
    return;
  }
}

function burst(world, x, y, color, n, speed, life = 0.7, size = 3) {
  for (let i = 0; i < n; i++) {
    if (world.particles.length >= C.maxParticles) return;
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.25, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      t: 0,
      life: life * range(world.rng, 0.6, 1.2),
      size: range(world.rng, size * 0.5, size * 1.4),
      color,
    });
  }
}

function addPopup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color: color || '#8ef6ff', t: 0 });
  if (world.popups.length > 14) world.popups.shift();
}

function setBanner(world, text, sub) {
  world.banner = { text, sub: sub || '' };
  world.bannerT = 2.4;
}

function die(world, cause) {
  const ship = world.ship;
  world.events.push('explosion');
  burst(world, ship.x, ship.y, '#ffb347', 42, 260, 0.9, 4);
  burst(world, ship.x, ship.y, '#ff5d5d', 26, 180, 0.8, 3);
  burst(world, ship.x, ship.y, '#ffffff', 12, 120, 0.5, 2);
  world.shake = C.shakeOnDeath;
  world.flash = 0.55;
  world.lives -= 1;
  world.combo = 0;
  world.comboTimer = 0;
  world.deathCause = cause;
  if (world.lives <= 0) {
    world.state = STATES.OVER;
    if (world.score > world.best) {
      world.best = world.score;
      try {
        localStorage.setItem('nova-drift-best', String(world.best));
      } catch {
        /* storage unavailable; best lives for the session */
      }
    }
    world.banner = null;
    world.bannerT = 0;
  } else {
    resetShip(world);
    const causeText = cause === 'corona' ? 'BURNED BY THE NOVA' : cause === 'lost' ? 'LOST IN THE DARK' : 'SHIP DESTROYED';
    setBanner(world, causeText, world.lives === 1 ? 'Last life — fly careful' : world.lives + ' lives left');
  }
}

function levelUp(world) {
  world.level += 1;
  world.orbsCollected = 0;
  world.events.push('level');
  setBanner(world, 'LEVEL ' + world.level, world.level === C.winLevel ? 'The star is charted!' : 'The field grows denser');
  // Top the field back up to the new level's asteroid count.
  const want = Math.min(C.asteroidBase + (world.level - 1) * C.asteroidPerLevel, C.asteroidMax);
  while (world.asteroids.length < want) spawnAsteroid(world);
  if (world.level === C.winLevel && !world.victoryShown) {
    world.victoryShown = true;
    world.endless = true;
    world.events.push('victory');
    world.score += 500;
    addPopup(world, world.ship.x, world.ship.y - 30, '+500 STAR CHARTED', '#ffd76a');
  }
}

// One fixed step (dt seconds). Input: {up,down,left,right,brake, pointer:{x,y}|null}.
export function step(world, input, dt) {
  world.time += dt;
  if (world.bannerT > 0) world.bannerT -= dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - C.shakeDecay * dt);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - 1.6 * dt);
  for (const p of world.particles) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 0.4 * dt;
    p.vy *= 1 - 0.4 * dt;
  }
  world.particles = world.particles.filter((p) => p.t < p.life);
  for (const p of world.popups) {
    p.t += dt;
    p.y -= 26 * dt;
  }
  world.popups = world.popups.filter((p) => p.t < 1.1);
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  if (world.state !== STATES.PLAYING) {
    // Title screen: let asteroids drift so the backdrop feels alive.
    driftAsteroids(world, dt);
    return;
  }

  const ship = world.ship;
  if (ship.invuln > 0) ship.invuln -= dt;

  // --- steering ---
  let ax = 0;
  let ay = 0;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (input.pointer) {
    const dx = input.pointer.x - ship.x;
    const dy = input.pointer.y - ship.y;
    const d = Math.hypot(dx, dy);
    if (d > 24) {
      ax += dx / d;
      ay += dy / d;
    }
  }
  const mag = Math.hypot(ax, ay);
  ship.thrusting = mag > 0.01;
  if (ship.thrusting) {
    ax /= mag;
    ay /= mag;
    ship.vx += ax * C.thrust * dt;
    ship.vy += ay * C.thrust * dt;
    ship.angle = Math.atan2(ay, ax);
    // Engine exhaust.
    ship.trail += dt;
    if (ship.trail > 0.03) {
      ship.trail = 0;
      if (world.particles.length < C.maxParticles) {
        world.particles.push({
          x: ship.x - Math.cos(ship.angle) * 14,
          y: ship.y - Math.sin(ship.angle) * 14,
          vx: -Math.cos(ship.angle) * 90 + range(world.rng, -16, 16),
          vy: -Math.sin(ship.angle) * 90 + range(world.rng, -16, 16),
          t: 0,
          life: 0.45,
          size: range(world.rng, 1.5, 3),
          color: Math.random() < 0.5 ? '#ffb347' : '#7dd7ff',
        });
      }
    }
  }
  if (input.brake) {
    const retain = Math.pow(C.brake, dt * 60);
    ship.vx *= retain;
    ship.vy *= retain;
  }

  // --- gravity toward the star ---
  const dx = world.star.x - ship.x;
  const dy = world.star.y - ship.y;
  const d2 = dx * dx + dy * dy;
  const d = Math.sqrt(d2) || 1;
  const g = C.gravity / Math.max(d2, C.gravityMinDist * C.gravityMinDist);
  ship.vx += (dx / d) * g * dt;
  ship.vy += (dy / d) * g * dt;

  // Drag + speed cap.
  const dragK = Math.pow(1 - C.drag, dt * 60);
  ship.vx *= dragK;
  ship.vy *= dragK;
  const sp = Math.hypot(ship.vx, ship.vy);
  if (sp > C.maxSpeed) {
    ship.vx *= C.maxSpeed / sp;
    ship.vy *= C.maxSpeed / sp;
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;

  driftAsteroids(world, dt);
  for (const o of world.orbs) o.phase += dt * 3;

  // --- deaths ---
  if (ship.invuln <= 0) {
    if (d < C.coronaRadius + C.shipRadius * 0.6) {
      die(world, 'corona');
      return;
    }
    if (d > world.escapeR) {
      die(world, 'lost');
      return;
    }
    for (const a of world.asteroids) {
      const rr = a.radius + C.shipRadius * 0.75;
      if (dist2(ship.x, ship.y, a.x, a.y) < rr * rr) {
        die(world, 'asteroid');
        return;
      }
    }
  }

  // --- orbs ---
  for (let i = world.orbs.length - 1; i >= 0; i--) {
    const o = world.orbs[i];
    const rr = o.radius + C.shipRadius + 6;
    if (dist2(ship.x, ship.y, o.x, o.y) < rr * rr) {
      world.orbs.splice(i, 1);
      world.combo += 1;
      world.comboTimer = C.comboWindow;
      const value = (o.golden ? C.novaOrbValue : C.orbValue) * (1 + Math.min(world.combo - 1, 8) * 0.25);
      const gained = Math.round(value);
      world.score += gained;
      world.orbsCollected += 1;
      world.totalCollected += 1;
      world.events.push(o.golden ? 'nova' : 'pickup');
      burst(world, o.x, o.y, o.golden ? '#ffd76a' : '#8ef6ff', o.golden ? 22 : 12, 130, 0.6, 2.5);
      addPopup(world, o.x, o.y - 14, '+' + gained, o.golden ? '#ffd76a' : '#8ef6ff');
      spawnOrb(world);
      if (world.orbsCollected >= C.orbsPerLevel) levelUp(world);
    }
  }
  while (world.orbs.length < C.orbsTarget) spawnOrb(world);
}

function driftAsteroids(world, dt) {
  for (const a of world.asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    a.rot += a.rotSpeed * dt;
    // Wrap around the playfield instead of vanishing: the field is a torus
    // for asteroids, so the density stays constant.
    const m = 40;
    if (a.x < -m) a.x = world.w + m;
    if (a.x > world.w + m) a.x = -m;
    if (a.y < -m) a.y = world.h + m;
    if (a.y > world.h + m) a.y = -m;
  }
}

export function startGame(world) {
  world.state = STATES.PLAYING;
  world.score = 0;
  world.lives = C.lives;
  world.level = 1;
  world.orbsCollected = 0;
  world.totalCollected = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.victoryShown = false;
  world.endless = false;
  world.deathCause = null;
  world.banner = null;
  world.bannerT = 0;
  world.particles = [];
  world.popups = [];
  resetShip(world, true);
  spawnInitial(world);
}

export function resize(world, w, h) {
  const sx = w / world.w;
  const sy = h / world.h;
  world.star.x = w * C.starX;
  world.star.y = h * C.starY;
  world.escapeR = Math.min(w, h) * 0.78;
  world.w = w;
  world.h = h;
  if (world.ship) {
    world.ship.x *= sx;
    world.ship.y *= sy;
  }
  for (const a of world.asteroids) {
    a.x *= sx;
    a.y *= sy;
  }
  for (const o of world.orbs) {
    o.x *= sx;
    o.y *= sy;
  }
}
