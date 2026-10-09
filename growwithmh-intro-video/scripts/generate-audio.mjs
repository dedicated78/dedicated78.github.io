// Generates the original instrumental bed and sound effects for the GrowwithMH intro.
// Everything is synthesised here (no samples, no third-party audio) and is fully
// deterministic: same timeline.json -> same WAV files.
//
//   node scripts/generate-audio.mjs
//
// Outputs public/audio/music.wav and public/audio/sfx.wav (48 kHz, 16-bit stereo, 40 s).
// SFX cues come from src/timeline.json, so retiming a cue there and re-running keeps
// sound and picture in sync.

import fs from 'node:fs';
import path from 'node:path';

const timeline = JSON.parse(fs.readFileSync(path.resolve('src/timeline.json'), 'utf8'));
const SR = 48000;
const FPS = timeline.fps;
const DUR = timeline.durationInFrames / FPS;
const N = Math.round(DUR * SR);
const TAU = Math.PI * 2;

// ---------- helpers ----------
const mulberry32 = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buf = () => [new Float32Array(N), new Float32Array(N)];
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const panGains = (pan) => {
  const a = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** RBJ biquad, coefficients can be updated per sample. */
class Biquad {
  constructor() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  set(type, f, q) {
    const w = (TAU * clamp(f, 20, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // band-pass (constant peak gain)
    const a0 = 1 + al;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - al) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Small Freeverb-style stereo reverb. */
function reverb([L, R], {room = 0.84, damp = 0.35, wet = 0.3, pre = 0.012} = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const scale = SR / 44100;
  const make = (spread) => ({
    combs: combT.map((t) => ({b: new Float32Array(Math.round((t + spread) * scale)), i: 0, f: 0})),
    aps: apT.map((t) => ({b: new Float32Array(Math.round((t + spread) * scale)), i: 0})),
  });
  const ch = [make(0), make(23)];
  const preN = Math.round(pre * SR);
  const out = buf();
  for (let c = 0; c < 2; c++) {
    const src = c === 0 ? L : R;
    const {combs, aps} = ch[c];
    for (let n = 0; n < N; n++) {
      const x = (n >= preN ? (L[n - preN] + R[n - preN]) * 0.5 : 0) * 0.03;
      let y = 0;
      for (const cb of combs) {
        const o = cb.b[cb.i];
        cb.f = o * (1 - damp) + cb.f * damp;
        cb.b[cb.i] = x + cb.f * room;
        cb.i = (cb.i + 1) % cb.b.length;
        y += o;
      }
      for (const ap of aps) {
        const o = ap.b[ap.i];
        ap.b[ap.i] = y + o * 0.5;
        ap.i = (ap.i + 1) % ap.b.length;
        y = o - y;
      }
      out[c][n] = src[n] + y * wet;
    }
  }
  return out;
}

function writeWav(file, [L, R], gain = 1) {
  const data = Buffer.alloc(N * 4);
  for (let n = 0; n < N; n++) {
    data.writeInt16LE(Math.round(clamp(L[n] * gain, -1, 1) * 32767), n * 4);
    data.writeInt16LE(Math.round(clamp(R[n] * gain, -1, 1) * 32767), n * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

const peak = ([L, R]) => {
  let p = 0;
  for (let n = 0; n < N; n++) p = Math.max(p, Math.abs(L[n]), Math.abs(R[n]));
  return p;
};

// ---------- music ----------
// Warm, sparse progression in D major. Chord changes land on scene boundaries.
const S = (k) => timeline.scenes[k].start / FPS;
const CHORDS = [
  {t: 0, notes: [47, 54, 57, 61, 62], root: 35}, // Bm(add9) — the question
  {t: S('s2'), notes: [50, 57, 61, 64, 66], root: 38}, // Dmaj9 — the introduction
  {t: S('s3'), notes: [43, 50, 54, 57, 59], root: 31}, // Gmaj7(9)
  {t: S('s4'), notes: [52, 55, 59, 62, 66], root: 40}, // Em9
  {t: 17.5, notes: [45, 52, 57, 59, 64], root: 33}, // A(add9)sus
  {t: S('s5'), notes: [47, 54, 57, 61, 62], root: 35}, // Bm(add9)
  {t: 24, notes: [43, 50, 54, 57, 62], root: 31}, // Gmaj7
  {t: S('s6'), notes: [50, 57, 61, 64, 66], root: 38}, // Dmaj9
  {t: 30.5, notes: [43, 50, 52, 57, 59], root: 31}, // G6/9
  {t: 32.5, notes: [45, 52, 55, 57, 62], root: 33}, // A7sus
  {t: S('s7'), notes: [50, 57, 61, 62, 66], root: 38}, // Dmaj9 — resolve
];
const chordAt = (t) => {
  let c = CHORDS[0];
  for (const ch of CHORDS) if (t >= ch.t) c = ch;
  return c;
};

function music() {
  const out = buf();
  const rnd = mulberry32(7);
  // Pad: each chord fades in/out with long overlaps.
  CHORDS.forEach((ch, idx) => {
    const t0 = ch.t;
    const t1 = idx + 1 < CHORDS.length ? CHORDS[idx + 1].t : DUR;
    const att = 0.9;
    const rel = 1.4;
    const a = Math.max(0, Math.floor((t0 - 0.3) * SR));
    const b = Math.min(N, Math.floor((t1 + rel) * SR));
    const voices = ch.notes.map((m, v) => ({
      f: midi(m + 12),
      det: 1 + (rnd() - 0.5) * 0.004,
      ph: rnd() * TAU,
      pan: (v / (ch.notes.length - 1)) * 1.2 - 0.6,
    }));
    const lp = [new Biquad().set('lp', 1000, 0.7), new Biquad().set('lp', 1000, 0.7)];
    for (let n = a; n < b; n++) {
      const t = n / SR;
      const env = clamp((t - (t0 - 0.3)) / att, 0, 1) * clamp((t1 + rel - t) / rel, 0, 1);
      if (env <= 0) continue;
      const sceneLevel = t < S('s2') ? 0.6 : t >= S('s7') ? 0.95 : 0.8;
      let l = 0;
      let r = 0;
      for (const v of voices) {
        const trem = 1 + 0.12 * Math.sin(TAU * 0.17 * t + v.ph);
        const s =
          Math.sin(TAU * v.f * t + v.ph) +
          0.32 * Math.sin(TAU * v.f * 2 * v.det * t) +
          0.12 * Math.sin(TAU * v.f * 3 * t + 1.1) +
          0.5 * Math.sin(TAU * v.f * v.det * t + v.ph * 0.5);
        const [gl, gr] = panGains(v.pan);
        l += s * gl * trem;
        r += s * gr * trem;
      }
      const cut = 900 + 700 * Math.sin(TAU * 0.05 * t) ** 2 + (t >= S('s7') ? 600 : 0);
      if (n % 32 === 0) {
        lp[0].set('lp', cut, 0.7);
        lp[1].set('lp', cut, 0.7);
      }
      out[0][n] += lp[0].run(l) * env * 0.022 * sceneLevel;
      out[1][n] += lp[1].run(r) * env * 0.022 * sceneLevel;
    }
  });

  // Sub bass: soft sine on the chord root.
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    const ch = chordAt(t);
    const since = t - ch.t;
    const env = clamp(since / 0.6, 0, 1) * (t < S('s2') ? 0.5 : 1) * clamp((DUR - t) / 1.2, 0, 1);
    const f = midi(ch.root + 12);
    const s = Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t);
    out[0][n] += s * env * 0.05;
    out[1][n] += s * env * 0.05;
  }

  // Plucked arpeggio: enters with the brand, 8ths from Scene 3, stops before the hold.
  const BPM = 96;
  const eighth = 60 / BPM / 2;
  const plucks = [];
  for (let k = 0; k * eighth < DUR; k++) {
    const t = k * eighth;
    if (t < S('s2') + 0.2 || t > 37.2) continue;
    if (t < S('s3') && k % 2 === 1) continue; // quarters in Scene 2
    const ch = chordAt(t);
    const order = [0, 2, 4, 3, 1, 3, 4, 2];
    const m = ch.notes[order[k % order.length]] + 24;
    const accent = k % 4 === 0 ? 1 : 0.7;
    plucks.push({t, f: midi(m), g: accent * (t >= S('s6') ? 1.1 : 1), pan: k % 2 ? 0.32 : -0.32});
  }
  for (const p of plucks) {
    const a = Math.floor(p.t * SR);
    const len = Math.floor(0.9 * SR);
    const [gl, gr] = panGains(p.pan);
    for (let i = 0; i < len && a + i < N; i++) {
      const t = i / SR;
      const env = Math.exp(-t / 0.22) * Math.min(1, t / 0.004);
      const s = Math.sin(TAU * p.f * t) + 0.18 * Math.sin(TAU * p.f * 2 * t) * Math.exp(-t / 0.05);
      out[0][a + i] += s * env * 0.035 * p.g * gl;
      out[1][a + i] += s * env * 0.035 * p.g * gr;
    }
  }

  // Very soft shaker on off-beat 16ths (Scenes 3–6) for gentle momentum.
  const nrand = mulberry32(99);
  const hp = new Biquad().set('hp', 6500, 0.7);
  for (let k = 0; k * (eighth / 2) < DUR; k++) {
    const t = k * (eighth / 2);
    if (t < S('s3') || t > S('s7') + 1 || k % 2 === 0) continue;
    const a = Math.floor(t * SR);
    const g = (k % 4 === 3 ? 1 : 0.55) * 0.012;
    for (let i = 0; i < 0.06 * SR && a + i < N; i++) {
      const env = Math.exp(-i / SR / 0.018);
      const s = hp.run(nrand() * 2 - 1) * env * g;
      out[0][a + i] += s * 0.8;
      out[1][a + i] += s;
    }
  }

  // Gentle master fade at the very end (CTA stays on screen; audio just settles).
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    const fade = clamp((DUR - t) / 1.6, 0, 1) * clamp(t / 0.4, 0, 1);
    out[0][n] *= fade;
    out[1][n] *= fade;
  }
  return reverb(out, {wet: 0.35, room: 0.86});
}

// ---------- sound effects ----------
function sfx() {
  const out = buf();
  const rnd = mulberry32(2024);
  const add = (n, l, r) => {
    if (n >= 0 && n < N) {
      out[0][n] += l;
      out[1][n] += r;
    }
  };

  const noiseBurst = (t0, {f = 3000, q = 1.2, dur = 0.03, decay = 0.012, gain = 0.3, pan = 0, type = 'bp'}) => {
    const bq = new Biquad().set(type, f, q);
    const a = Math.floor(t0 * SR);
    const [gl, gr] = panGains(pan);
    for (let i = 0; i < dur * SR; i++) {
      const env = Math.exp(-i / SR / decay) * Math.min(1, i / 24);
      const s = bq.run(rnd() * 2 - 1) * env * gain;
      add(a + i, s * gl, s * gr);
    }
  };
  const tone = (t0, {f = 1000, f2, dur = 0.05, decay = 0.02, gain = 0.2, pan = 0, attack = 0.002}) => {
    const a = Math.floor(t0 * SR);
    const [gl, gr] = panGains(pan);
    let ph = 0;
    for (let i = 0; i < dur * SR; i++) {
      const t = i / SR;
      const fr = f2 ? f + (f2 - f) * Math.min(1, t / dur) : f;
      ph += (TAU * fr) / SR;
      const env = Math.exp(-t / decay) * Math.min(1, t / attack);
      const s = Math.sin(ph) * env * gain;
      add(a + i, s * gl, s * gr);
    }
  };
  /** Filtered-noise sweep with moving pan. shape: centre frequency path and envelope. */
  const sweep = (t0, dur, {gain = 0.3, panFrom = 0, panTo = 0, fFrom = 400, fTo = 2400, q = 0.9, peakAt = 0.6, type = 'bp'}) => {
    const bq = new Biquad().set(type, fFrom, q);
    const a = Math.floor(t0 * SR);
    const len = Math.floor(dur * SR);
    for (let i = 0; i < len; i++) {
      const u = i / len;
      if (i % 16 === 0) bq.set(type, fFrom * Math.pow(fTo / fFrom, u), q);
      const env = u < peakAt ? Math.pow(u / peakAt, 2) : Math.pow((1 - u) / (1 - peakAt), 1.6);
      const s = bq.run(rnd() * 2 - 1) * env * gain;
      const [gl, gr] = panGains(panFrom + (panTo - panFrom) * u);
      add(a + i, s * gl, s * gr);
    }
  };

  for (const c of timeline.sfx) {
    const t = c.frame / FPS;
    const g = c.gain ?? 0.5;
    const pan = c.pan ?? 0;
    const dur = (c.dur ?? 20) / FPS;
    switch (c.type) {
      case 'typing': {
        const span = (c.end - c.frame) / FPS;
        for (let i = 0; i < c.chars; i++) {
          const tt = t + (span * i) / c.chars + (rnd() - 0.5) * 0.008;
          const v = 0.65 + rnd() * 0.35;
          noiseBurst(tt, {f: 2600 + rnd() * 1400, q: 1.4, dur: 0.04, decay: 0.009, gain: 0.55 * g * v, pan: pan + (rnd() - 0.5) * 0.1});
          tone(tt, {f: 210 + rnd() * 40, dur: 0.03, decay: 0.01, gain: 0.18 * g * v, pan});
        }
        break;
      }
      case 'click':
        noiseBurst(t, {f: 2200, q: 1.6, dur: 0.03, decay: 0.006, gain: 0.7 * g, pan});
        tone(t, {f: 1150, dur: 0.03, decay: 0.008, gain: 0.25 * g, pan});
        noiseBurst(t + 0.07, {f: 2700, q: 1.6, dur: 0.03, decay: 0.005, gain: 0.45 * g, pan});
        break;
      case 'tick':
        tone(t, {f: 1760, dur: 0.05, decay: 0.012, gain: 0.22 * g, pan});
        noiseBurst(t, {f: 4200, q: 2, dur: 0.02, decay: 0.004, gain: 0.25 * g, pan});
        break;
      case 'shutter':
        noiseBurst(t, {f: 1500, q: 1.1, dur: 0.06, decay: 0.012, gain: 0.6 * g, pan});
        noiseBurst(t + 0.045, {f: 1900, q: 1.1, dur: 0.06, decay: 0.016, gain: 0.45 * g, pan});
        tone(t, {f: 140, f2: 90, dur: 0.12, decay: 0.04, gain: 0.35 * g, pan});
        break;
      case 'air':
        sweep(t, dur, {gain: 0.5 * g, panFrom: pan, panTo: -pan, fFrom: 300, fTo: 900, q: 0.6, peakAt: 0.45, type: 'lp'});
        break;
      case 'whoosh':
        sweep(t, dur, {gain: 0.9 * g, panFrom: c.panFrom, panTo: c.panTo, fFrom: 350, fTo: 2600, q: 0.8, peakAt: 0.62});
        break;
      case 'brush':
        sweep(t, dur, {gain: 0.8 * g, panFrom: c.panFrom, panTo: c.panTo, fFrom: 1800, fTo: 700, q: 0.7, peakAt: 0.5});
        break;
      case 'lift':
        sweep(t, dur, {gain: 0.8 * g, panFrom: c.panFrom, panTo: c.panTo, fFrom: 500, fTo: 3000, q: 1, peakAt: 0.5});
        tone(t, {f: 587, f2: 880, dur: dur, decay: dur * 0.5, gain: 0.05 * g, attack: dur * 0.4, pan: 0});
        break;
      case 'glide':
        sweep(t, dur, {gain: 0.7 * g, panFrom: c.panFrom, panTo: c.panTo, fFrom: 600, fTo: 1600, q: 1.2, peakAt: 0.7});
        break;
      case 'scan': {
        const bq = new Biquad().set('bp', 1800, 3);
        const a = Math.floor(t * SR);
        const len = Math.floor(dur * SR);
        for (let i = 0; i < len; i++) {
          const u = i / len;
          if (i % 32 === 0) bq.set('bp', 1800 + 900 * Math.sin(TAU * u * 3), 3);
          const env = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
          const s = bq.run(rnd() * 2 - 1) * env * 0.35 * g;
          add(a + i, s * 0.9, s);
        }
        break;
      }
      case 'drop':
        tone(t, {f: 120, f2: 62, dur: 0.35, decay: 0.12, gain: 0.7 * g, pan, attack: 0.004});
        noiseBurst(t, {f: 900, q: 0.8, dur: 0.05, decay: 0.01, gain: 0.3 * g, pan});
        break;
      case 'reveal': {
        // Reverse swell into a warm, low bloom (pure harmonic partials, no bell-like tones).
        sweep(t - 0.45, 0.5, {gain: 0.35 * g, panFrom: -0.2, panTo: pan, fFrom: 300, fTo: 1400, q: 0.6, peakAt: 0.95, type: 'lp'});
        const partials = [
          [73.42, 0.55],
          [146.83, 0.5],
          [220.0, 0.32],
          [293.66, 0.26],
          [369.99, 0.16],
          [440.0, 0.12],
        ];
        for (const [f, a] of partials) tone(t, {f, dur: 2.8, decay: 0.9, gain: a * 0.42 * g, pan: pan * 0.5, attack: 0.025});
        noiseBurst(t, {f: 2400, q: 0.8, dur: 0.08, decay: 0.02, gain: 0.12 * g, pan});
        break;
      }
      default:
        throw new Error(`Unknown sfx type ${c.type}`);
    }
  }
  return reverb(out, {wet: 0.16, room: 0.7, damp: 0.5});
}

const m = music();
const fx = sfx();
const mp = peak(m);
const fp = peak(fx);
// Music bed peaks at about -17 dBFS, effects at about -7 dBFS: room left for narration.
writeWav('public/audio/music.wav', m, 0.14 / mp);
writeWav('public/audio/sfx.wav', fx, 0.45 / fp);
console.log(`music.wav + sfx.wav written (${DUR}s @ ${SR} Hz). Raw peaks: music ${mp.toFixed(3)}, sfx ${fp.toFixed(3)}`);
