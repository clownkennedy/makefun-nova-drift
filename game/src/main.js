// NOVA DRIFT — boot, state machine and the fixed-step game loop.
// The loop runs at a fixed 1/60s simulation step with an accumulator so the
// physics is identical on every machine; rendering follows each frame.
import { CONFIG as C } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { STATES, createWorld, resize, startGame, step } from './world.js';
import { createRenderer } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const shotSeed = Number(params.get('seed') || '1') || 1;

const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

let dpr = 1;
let w = 0;
let h = 0;
let world = null;

function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  if (world) resize(world, w, h);
}

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function freshWorld() {
  const seed = shotName ? shotSeed : undefined;
  world = createWorld(w, h, seed);
  world.muted = audio.muted;
}

fit();
freshWorld();
let frozen = false;
if (shotName) {
  applyShot(world, shotName, shotSeed);
  // Freeze the staged state: the live loop only advances cosmetic time, so
  // the screenshot shows exactly the state the simulation staged — the ship
  // cannot drift into the star while the capture runs.
  frozen = true;
  announce('NOVA DRIFT screenshot: ' + shotName);
} else {
  announce('NOVA DRIFT. Thrust with arrow keys or WASD. Press Enter to launch.');
}

window.addEventListener('resize', () => {
  fit();
});

function readInput() {
  const k = input.keys;
  return {
    up: k.has('up'),
    down: k.has('down'),
    left: k.has('left'),
    right: k.has('right'),
    brake: k.has('brake'),
    pointer: input.pointer,
  };
}

function drainEvents() {
  for (const e of world.events) {
    if (e === 'pickup') audio.pickup(world.combo);
    else if (e === 'nova') audio.nova();
    else if (e === 'explosion') audio.explosion();
    else if (e === 'level') audio.level();
    else if (e === 'victory') audio.victory();
  }
  world.events.length = 0;
}

const STEP = 1 / 60;
let acc = 0;
let last = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25; // tab was hidden; don't spiral
  acc += dt;

  const pressed = input.takePressed();
  if (pressed.has('mute')) {
    const muted = audio.toggleMute();
    world.muted = muted;
  }
  if (pressed.has('click') || pressed.has('enter')) audio.unlock();

  // --- state transitions (edge-triggered) ---
  if (world.state === STATES.TITLE) {
    if (pressed.has('enter') || pressed.has('click')) {
      audio.click();
      startGame(world);
      announce('Flying. Catch orbs, dodge asteroids, stay out of the corona.');
    }
  } else if (world.state === STATES.PLAYING) {
    if (pressed.has('pause')) {
      world.state = STATES.PAUSED;
      announce('Paused. Press P to keep flying.');
    }
  } else if (world.state === STATES.PAUSED) {
    if (pressed.has('pause') || pressed.has('enter') || pressed.has('click')) {
      world.state = STATES.PLAYING;
      announce('Flying.');
    }
  } else if (world.state === STATES.OVER) {
    if (pressed.has('restart') || pressed.has('enter') || pressed.has('click')) {
      audio.click();
      startGame(world);
      announce('Flying. Catch orbs, dodge asteroids, stay out of the corona.');
    }
  }

  // --- fixed-step simulation ---
  if (frozen) {
    // Staged screenshot: only cosmetic time moves (pulses, shimmer).
    world.time += dt;
  } else {
    const inputState = world.state === STATES.PLAYING ? readInput() : { up: false, down: false, left: false, right: false, brake: false, pointer: null };
    let n = 0;
    while (acc >= STEP && n < 5) {
      step(world, inputState, STEP);
      drainEvents();
      acc -= STEP;
      n++;
    }
    if (n === 5) acc = 0;
  }

  // --- render ---
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderer.render(world, w, h, dpr);
}

requestAnimationFrame(frame);
