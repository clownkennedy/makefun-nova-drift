// Keyboard + pointer input. Keys are tracked as a live set; the world reads
// them every fixed step. Pointer position is in canvas CSS pixels.
export function createInput(canvas) {
  const keys = new Set();
  let pointer = null; // {x, y} while the pointer is down, else null
  let pointerPos = { x: 0, y: 0 };
  let pressed = new Set(); // edge-triggered keys, consumed by the game each frame

  function keyName(e) {
    // Normalise arrows + WASD to single names.
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') return 'up';
    if (k === 'arrowdown' || k === 's') return 'down';
    if (k === 'arrowleft' || k === 'a') return 'left';
    if (k === 'arrowright' || k === 'd') return 'right';
    if (k === ' ') return 'brake';
    if (k === 'enter') return 'enter';
    if (k === 'p' || k === 'escape') return 'pause';
    if (k === 'r') return 'restart';
    if (k === 'm') return 'mute';
    return null;
  }

  function onKeyDown(e) {
    const name = keyName(e);
    if (!name) return;
    if (['up', 'down', 'left', 'right', 'brake'].includes(name)) e.preventDefault();
    if (!keys.has(name)) pressed.add(name);
    keys.add(name);
  }
  function onKeyUp(e) {
    const name = keyName(e);
    if (name) keys.delete(name);
  }
  function onPointerDown(e) {
    const r = canvas.getBoundingClientRect();
    pointerPos = { x: e.clientX - r.left, y: e.clientY - r.top };
    pointer = { ...pointerPos };
    pressed.add('click');
  }
  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    pointerPos = { x: e.clientX - r.left, y: e.clientY - r.top };
    if (pointer) pointer = { ...pointerPos };
  }
  function onPointerUp() {
    pointer = null;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  return {
    keys,
    get pointer() {
      return pointer;
    },
    get pointerPos() {
      return pointerPos;
    },
    // Returns and clears the edge-triggered presses since the last call.
    takePressed() {
      const out = pressed;
      pressed = new Set();
      return out;
    },
  };
}
