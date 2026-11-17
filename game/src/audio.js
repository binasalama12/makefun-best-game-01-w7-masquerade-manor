// Tiny WebAudio synth for MASQUERADE MANOR: no audio files, just shaped
// oscillator blips — a paper tick when a clue is pinned, a low bell when
// an incident lands, a bright chord when a case is solved and a falling
// figure when the Thorn strikes. Guarded so the game stays silent
// rather than broken without audio.

let ctx = null;
let master = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.15;
    master.connect(ctx.destination);
  } catch { ctx = null; }
}

function blip(freqA, freqB, dur, type = 'sine', vol = 1, when = 0) {
  if (!ctx || !master) return;
  try {
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freqA, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, freqB), t0 + dur);
    g.gain.setValueAtTime(vol * 0.9, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* silence is fine */ }
}

export const sfx = {
  tick() { blip(1100, 640, 0.06, 'triangle', 0.6); },
  clue() { blip(760, 1180, 0.16, 'sine', 0.8); blip(1180, 1560, 0.2, 'sine', 0.45, 0.05); },
  bell() { blip(392, 390, 0.5, 'sine', 0.7); blip(784, 780, 0.34, 'sine', 0.3, 0.02); },
  observe() { blip(520, 700, 0.1, 'triangle', 0.55); },
  pin() { blip(300, 180, 0.09, 'square', 0.4); },
  draft() { [440, 554, 659].forEach((f, i) => blip(f, f, 0.26, 'sine', 0.7, i * 0.07)); },
  solved() { [523, 659, 784, 1046, 1318].forEach((f, i) => blip(f, f, 0.36, 'sine', 0.8, i * 0.09)); },
  strike() { blip(900, 70, 0.8, 'sawtooth', 0.8); [330, 262, 196, 131].forEach((f, i) => blip(f, f * 0.95, 0.4, 'triangle', 0.7, 0.15 + i * 0.13)); },
};
