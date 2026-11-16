// Tiny WebAudio synth: no audio files, no network. Everything is an
// oscillator + gain envelope. Created lazily on the first user gesture so
// headless/screenshot runs (which never gesture) stay silent and never throw.
export function createAudio() {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (muted) return null;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
      }
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  function tone({ freq, freqEnd, dur, type = 'sine', gain = 0.12, when = 0 }) {
    const c = ensure();
    if (!c) return;
    try {
      const t0 = c.currentTime + when;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      /* audio is decoration; never break the game */
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup(combo) {
      const base = 520 + Math.min(combo, 12) * 36;
      tone({ freq: base, freqEnd: base * 1.6, dur: 0.14, type: 'sine', gain: 0.1 });
    },
    nova() {
      tone({ freq: 660, freqEnd: 1320, dur: 0.22, type: 'triangle', gain: 0.12 });
      tone({ freq: 990, freqEnd: 1980, dur: 0.26, type: 'sine', gain: 0.07, when: 0.05 });
    },
    explosion() {
      tone({ freq: 160, freqEnd: 34, dur: 0.5, type: 'sawtooth', gain: 0.16 });
      tone({ freq: 90, freqEnd: 28, dur: 0.6, type: 'square', gain: 0.08, when: 0.03 });
    },
    level() {
      tone({ freq: 440, dur: 0.12, type: 'triangle', gain: 0.1 });
      tone({ freq: 587, dur: 0.12, type: 'triangle', gain: 0.1, when: 0.1 });
      tone({ freq: 880, dur: 0.2, type: 'triangle', gain: 0.11, when: 0.2 });
    },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, dur: 0.22, type: 'triangle', gain: 0.1, when: i * 0.12 }),
      );
    },
    click() {
      tone({ freq: 700, freqEnd: 900, dur: 0.06, type: 'sine', gain: 0.06 });
    },
  };
}
