// NOVA DRIFT — rendering. All drawing is canvas 2D, no assets, no network.
// The deep-space backdrop (starfield + nebulae) is pre-rendered once per
// resize into an offscreen canvas so every frame stays cheap.
import { CONFIG as C } from './config.js';
import { clamp } from './random.js';
import { STATES } from './world.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let bg = null; // offscreen backdrop canvas
  let bgW = 0;
  let bgH = 0;
  let bgSeed = 0;

  function buildBackground(w, h, seed) {
    bg = document.createElement('canvas');
    bg.width = Math.max(2, Math.floor(w));
    bg.height = Math.max(2, Math.floor(h));
    bgW = w;
    bgH = h;
    bgSeed = seed;
    const b = bg.getContext('2d');
    // Deep-space vertical gradient.
    const g = b.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#05060f');
    g.addColorStop(0.55, '#0a0d24');
    g.addColorStop(1, '#120a24');
    b.fillStyle = g;
    b.fillRect(0, 0, w, h);
    // Nebulae: big soft radial blobs in violet/teal/rose.
    const rng = mulberry(seed);
    const cols = ['124, 78, 214', '32, 140, 190', '190, 60, 120', '60, 90, 200'];
    for (let i = 0; i < C.nebulaBlobs; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const r = 120 + rng() * 260;
      const col = cols[i % cols.length];
      const rg = b.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `rgba(${col},0.20)`);
      rg.addColorStop(1, `rgba(${col},0)`);
      b.fillStyle = rg;
      b.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // Stars: three parallax layers by size/alpha, a few with a cross sparkle.
    for (let i = 0; i < C.starfieldStars; i++) {
      const x = rng() * w;
      const y = rng() * h;
      const s = rng();
      const r = s < 0.7 ? 0.8 : s < 0.92 ? 1.4 : 2.1;
      const a = 0.35 + rng() * 0.6;
      b.globalAlpha = a;
      b.fillStyle = s > 0.9 ? '#cfe8ff' : '#ffffff';
      b.beginPath();
      b.arc(x, y, r, 0, Math.PI * 2);
      b.fill();
      if (s > 0.96) {
        b.globalAlpha = a * 0.5;
        b.fillRect(x - 5, y - 0.5, 10, 1);
        b.fillRect(x - 0.5, y - 5, 1, 10);
      }
    }
    b.globalAlpha = 1;
  }

  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStar(world, t) {
    const { x, y } = world.star;
    const pulse = 1 + Math.sin(t * 1.7) * 0.03;
    const core = C.starRadius * pulse;
    // Outer glow.
    let g = ctx.createRadialGradient(x, y, core * 0.4, x, y, core * 4.4);
    g.addColorStop(0, 'rgba(255, 190, 90, 0.55)');
    g.addColorStop(0.35, 'rgba(255, 120, 40, 0.20)');
    g.addColorStop(1, 'rgba(255, 90, 20, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, core * 4.4, 0, Math.PI * 2);
    ctx.fill();
    // Corona ring (the death line) — dashed so the danger reads clearly.
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 150, 60, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.lineDashOffset = -t * 22;
    ctx.beginPath();
    ctx.arc(x, y, C.coronaRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Plasma arcs.
    ctx.save();
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 3; i++) {
      const a0 = t * (0.5 + i * 0.22) + i * 2.1;
      ctx.strokeStyle = i === 1 ? '#ffd76a' : '#ff9a3d';
      ctx.lineWidth = 3 - i * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, core * (0.86 + i * 0.1), a0, a0 + 1.5 + 0.4 * Math.sin(t + i));
      ctx.stroke();
    }
    ctx.restore();
    // Core.
    g = ctx.createRadialGradient(x - core * 0.25, y - core * 0.3, core * 0.1, x, y, core);
    g.addColorStop(0, '#fff7d6');
    g.addColorStop(0.45, '#ffd76a');
    g.addColorStop(0.8, '#ff8c2e');
    g.addColorStop(1, '#e2481e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, core, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOrbitHint(world) {
    // Faint dotted ring at the escape boundary so "lost in the dark" is fair.
    ctx.save();
    ctx.strokeStyle = 'rgba(140, 180, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 12]);
    ctx.beginPath();
    ctx.arc(world.star.x, world.star.y, world.escapeR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawOrb(world, o, t) {
    const pulse = 1 + Math.sin(o.phase) * 0.18;
    const r = o.radius * pulse;
    const col = o.golden ? '255, 215, 106' : '142, 246, 255';
    const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 2.6);
    g.addColorStop(0, `rgba(${col},0.85)`);
    g.addColorStop(0.4, `rgba(${col},0.28)`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = o.golden ? '#ffe9a3' : '#d9fbff';
    ctx.beginPath();
    ctx.arc(o.x, o.y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawAsteroid(a) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    const shade = Math.floor(110 + a.shade * 60);
    ctx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.92)}, ${Math.floor(shade * 0.85)})`;
    ctx.strokeStyle = 'rgba(20, 16, 28, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const n = a.verts.length;
    for (let i = 0; i <= n; i++) {
      const v = a.verts[i % n];
      const ang = (i / n) * Math.PI * 2;
      const px = Math.cos(ang) * a.radius * v;
      const py = Math.sin(ang) * a.radius * v;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Craters.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.arc(-a.radius * 0.3, -a.radius * 0.15, a.radius * 0.22, 0, Math.PI * 2);
    ctx.arc(a.radius * 0.35, a.radius * 0.3, a.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShip(world, t) {
    const s = world.ship;
    ctx.save();
    ctx.translate(s.x, s.y);
    // Invulnerability blink.
    if (s.invuln > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.35;
    ctx.rotate(s.angle);
    // Engine flame.
    if (s.thrusting) {
      const f = 12 + Math.sin(t * 34) * 5 + Math.random() * 4;
      const g = ctx.createLinearGradient(-10, 0, -10 - f, 0);
      g.addColorStop(0, 'rgba(255, 210, 110, 0.95)');
      g.addColorStop(0.6, 'rgba(255, 120, 40, 0.6)');
      g.addColorStop(1, 'rgba(255, 80, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.lineTo(-10 - f, 0);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
    }
    // Hull: a dart with swept wings, cyan-white with an orange stripe.
    ctx.shadowColor = '#7dd7ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#eaf7ff';
    ctx.strokeStyle = '#2b6f92';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff9a3d';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-4, -3.4);
    ctx.lineTo(-4, 3.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#12303f';
    ctx.beginPath();
    ctx.arc(5, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      const a = 1 - p.t / p.life;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups(world) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    for (const p of world.popups) {
      ctx.globalAlpha = 1 - p.t / 1.1;
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  function drawHud(world, w) {
    ctx.save();
    ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
    roundRect(12, 10, 232, 64, 10);
    ctx.fill();
    ctx.fillStyle = '#eaf7ff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('SCORE ' + world.score.toLocaleString('en-US'), 24, 34);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#9fb4d8';
    ctx.fillText('BEST ' + world.best.toLocaleString('en-US'), 24, 56);
    // Lives, top right.
    ctx.textAlign = 'right';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = '#eaf7ff';
    ctx.fillText('LEVEL ' + world.level, w - 24, 34);
    for (let i = 0; i < C.lives; i++) {
      const x = w - 30 - i * 26;
      const y = 56;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = i < world.lives ? '#8ef6ff' : 'rgba(140,160,190,0.25)';
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Combo meter under the score box.
    if (world.combo > 1) {
      const frac = clamp(world.comboTimer / C.comboWindow, 0, 1);
      ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
      roundRect(12, 82, 232, 22, 8);
      ctx.fill();
      ctx.fillStyle = '#ffd76a';
      roundRect(16, 87, 224 * frac, 12, 6);
      ctx.fill();
      ctx.fillStyle = '#1a1206';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('COMBO x' + world.combo, 22, 96);
    }
    ctx.restore();
  }

  function drawBanner(world, w, h) {
    if (!world.banner || world.bannerT <= 0) return;
    const a = clamp(world.bannerT / 0.4, 0, 1) * clamp((2.4 - world.bannerT) / 0.25, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76a';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillText(world.banner.text, w / 2, h * 0.3);
    if (world.banner.sub) {
      ctx.fillStyle = '#cfe0ff';
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(world.banner.sub, w / 2, h * 0.3 + 30);
    }
    ctx.restore();
  }

  function panel(w, h, lines, yTop) {
    const pw = Math.min(620, w * 0.86);
    const ph = 92 + lines.length * 30;
    const x = (w - pw) / 2;
    const y = yTop === undefined ? (h - ph) / 2 : yTop;
    ctx.save();
    ctx.fillStyle = 'rgba(5, 8, 20, 0.82)';
    roundRect(x, y, pw, ph, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(142, 246, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    return { x, y, w: pw, h: ph };
  }

  function drawTitle(world, w, h, t) {
    // Title at the top, instructions panel near the bottom: the star and the
    // drifting field stay visible in the middle of the screen.
    ctx.save();
    ctx.textAlign = 'center';
    const cx = w / 2;
    ctx.fillStyle = '#8ef6ff';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.shadowColor = '#2ea8ff';
    ctx.shadowBlur = 26;
    ctx.fillText('NOVA DRIFT', cx, h * 0.15);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd76a';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Slingshot the dying star. Steal its light. Stay alive.', cx, h * 0.15 + 36);
    const rows = [
      'Thrust  ·  Arrow keys / WASD — or hold the mouse',
      'Brake  ·  Space        Pause  ·  P        Mute  ·  M',
      'Ride the gravity well. Catch orbs, dodge the rocks,',
      'never touch the corona — and never drift into the dark.',
    ];
    const p = panel(w, h, rows, h - 300);
    ctx.fillStyle = '#d7e6ff';
    ctx.font = '16px system-ui, sans-serif';
    rows.forEach((row, i) => ctx.fillText(row, cx, p.y + 44 + i * 30));
    const blink = 0.55 + Math.sin(t * 3.2) * 0.45;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#8ef6ff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO LAUNCH', cx, p.y + p.h + 44);
    ctx.globalAlpha = 1;
    if (world.best > 0) {
      ctx.fillStyle = '#9fb4d8';
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText('Best run: ' + world.best.toLocaleString('en-US'), cx, p.y + p.h + 72);
    }
    ctx.restore();
  }

  function drawPaused(world, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 6, 16, 0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eaf7ff';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('PAUSED', w / 2, h / 2 - 8);
    ctx.fillStyle = '#9fb4d8';
    ctx.font = '17px system-ui, sans-serif';
    ctx.fillText('Press P or Esc to keep flying', w / 2, h / 2 + 30);
    ctx.restore();
  }

  function drawOver(world, w, h) {
    const isBest = world.score > 0 && world.score >= world.best;
    const cause =
      world.deathCause === 'corona'
        ? 'The nova claimed your ship.'
        : world.deathCause === 'lost'
          ? 'Your ship drifted beyond the last star.'
          : 'An asteroid ended the run.';
    const p = panel(
      w,
      h,
      [
        'FINAL SCORE',
        'LEVEL',
        'ORBS',
        'CAUSE',
        'RESTART',
      ],
      (h - (92 + 5 * 30)) / 2 + 161,
    );
    ctx.save();
    ctx.textAlign = 'center';
    const cx = w / 2;
    ctx.fillStyle = '#ff7d6a';
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillText(world.victoryShown ? 'STAR CHARTED!' : 'RUN OVER', cx, p.y + 52);
    ctx.fillStyle = '#eaf7ff';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillText(world.score.toLocaleString('en-US'), cx, p.y + 100);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillStyle = '#9fb4d8';
    ctx.fillText('Level ' + world.level + '  ·  ' + world.totalCollected + ' orbs caught', cx, p.y + 128);
    ctx.fillText(cause, cx, p.y + 152);
    if (isBest) {
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillText('★ NEW BEST ★', cx, p.y + 178);
    }
    const blink = 0.55 + Math.sin(world.time * 3.2) * 0.45;
    ctx.globalAlpha = blink;
    ctx.fillStyle = '#8ef6ff';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN', cx, p.y + p.h + 42);
    ctx.restore();
  }

  function render(world, w, h, dpr) {
    const t = world.time;
    if (!bg || bgW !== w || bgH !== h) buildBackground(w, h, 20261116);
    ctx.save();
    // Screen shake.
    if (world.shake > 0) {
      const s = world.shake;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }
    ctx.drawImage(bg, 0, 0, w, h);
    drawStar(world, t);
    drawOrbitHint(world);
    for (const o of world.orbs) drawOrb(world, o, t);
    for (const a of world.asteroids) drawAsteroid(a);
    if (world.state !== STATES.OVER) drawShip(world, t);
    drawParticles(world);
    drawPopups(world);
    // Vignette.
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(2,3,10,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    if (world.flash > 0) {
      ctx.fillStyle = `rgba(255, 240, 220, ${world.flash})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();

    // HUD + screens live outside the shake transform.
    if (world.state === STATES.PLAYING || world.state === STATES.PAUSED) drawHud(world, w);
    drawBanner(world, w, h);
    if (world.state === STATES.TITLE) drawTitle(world, w, h, t);
    else if (world.state === STATES.PAUSED) drawPaused(world, w, h);
    else if (world.state === STATES.OVER) drawOver(world, w, h);
  }

  return { render };
}
