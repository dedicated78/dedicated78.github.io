// Original instrumental phonk for the GrowwithMH intro + sparse sound effects.
// Fully synthesised and deterministic (no samples, no third-party audio).
//
//   node scripts/generate-audio.mjs
//
// Writes:
//   public/audio/music.wav            full music mix (drums + 808 + cowbell)
//   public/audio/sfx.wav              sound effects (cues from src/timeline.json)
//   public/audio/stems/*.wav          drums / bass / cowbell stems for re-mixing under narration
//   src/beats.json                    beat markers (kick, snare, accents, phrases) in frames
//
// Grid: 150 BPM, 4/4. One beat = 0.4 s = 12 frames @ 30 fps; one bar = 1.6 s = 48 frames;
// one 16th-note step = 0.1 s = 3 frames. 20 bars = 32.0 s exactly, so every hit lands on a frame.

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {Biquad, SR, TAU, clamp, db, midi, mixInto, pan, peak, reverb, rng, scale, softClip, stereo, writeWav} from './audio-lib.mjs';

const timeline = JSON.parse(fs.readFileSync(path.resolve('src/timeline.json'), 'utf8'));
const FPS = timeline.fps;
const BPM = 150;
const STEP = 60 / BPM / 4; // 0.1 s
const BARS = 20;
const DUR = timeline.durationInFrames / FPS; // 32 s
const N = Math.round(DUR * SR);
if (Math.abs(BARS * 16 * STEP - DUR) > 1e-9) throw new Error('Timeline length must be 20 bars at 150 BPM');

const tOf = (bar, step) => ((bar - 1) * 16 + step) * STEP; // bar is 1-based
const frameOf = (bar, step) => Math.round(tOf(bar, step) * FPS);

// ---------------------------------------------------------------- arrangement
// Key: C# minor. Cowbell notes as MIDI numbers.
const Cs5 = 73, E5 = 76, Fs5 = 78, Gs5 = 80, B4 = 71, B5 = 83, Cs6 = 85;
const COW = {
  A: [[0, Cs5], [3, Cs5], [6, E5], [8, Cs5], [10, Fs5], [12, E5], [14, B4]],
  B: [[0, Cs5], [3, Cs5], [6, E5], [8, Cs5], [10, Gs5], [11, Fs5], [12, E5], [14, Cs5]],
  Bturn: [[0, Cs5], [3, Cs5], [6, E5], [8, Cs5], [10, Gs5], [12, B5], [13, Gs5], [14, Fs5], [15, E5]],
  V1: [[0, Gs5], [3, Gs5], [6, Fs5], [8, E5], [10, Fs5], [12, E5], [14, Cs5]],
  V2: [[0, Gs5], [3, Gs5], [6, Fs5], [8, E5], [10, B5], [12, Gs5]],
  S: [[0, Cs5], [6, E5], [10, Gs5]],
  Sfill: [[0, Cs5], [6, E5], [10, Gs5], [12, Fs5], [14, E5]],
  Hi: [[0, Cs5], [3, Cs5], [6, E5], [8, Cs6, 0.42], [11, Gs5], [14, Fs5]],
  End: [[0, Gs5], [2, Fs5], [4, E5], [6, B4], [8, Cs5, 0.9]],
};
const ROOT = {Cs: 37, A: 33, B: 35}; // 808 roots: C#2, A1, B1

const K1 = [0, 8, 11];
const K2 = [0, 6, 8, 14];

// One row per bar (1..20). Sections: opening 1–2, brand 3–4, local 5–8, website 9–12,
// answers 13–15, personal 16–18, finish 19–20.
const ARR = [
  /* 1 */ {kick: [0, 8], snare: [], hats: '8', cow: 'A', root: 'Cs', open: false},
  /* 2 */ {kick: K1, snare: [4, 12, 13, 14, 15], hats: '16', cow: 'B', root: 'Cs', riser: [8, 16]},
  /* 3 */ {kick: K1, snare: [4, 12], hats: '16', cow: 'A', root: 'Cs', impact: 0},
  /* 4 */ {kick: K2, snare: [4, 12], hats: 'roll', cow: 'B', root: 'B'},
  /* 5 */ {kick: K1, snare: [4, 12], hats: '16', cow: 'A', root: 'Cs', open: true},
  /* 6 */ {kick: K2, snare: [4, 12], hats: '16', cow: 'B', root: 'Cs', open: true},
  /* 7 */ {kick: K1, snare: [4, 12], hats: '16', cow: 'A', root: 'A', open: true},
  /* 8 */ {kick: K2, snare: [4, 12], hats: 'roll', cow: 'Bturn', root: 'B', glide: 14},
  /* 9 */ {kick: K1, snare: [4, 12], hats: '16', cow: 'V1', root: 'Cs'},
  /* 10 */ {kick: K2, snare: [4, 12], hats: '16', cow: 'V2', root: 'Cs'},
  /* 11 */ {kick: K1, snare: [4, 12], hats: '16', cow: 'V1', root: 'A', accent: 0},
  /* 12 */ {kick: [0, 8], snare: [4], hats: 'stop', cow: 'V2', root: 'B', stopAt: 12},
  /* 13 */ {kick: K1, snare: [4, 12], hats: 'trip', cow: 'S', root: 'A'},
  /* 14 */ {kick: K1, snare: [4, 12], hats: 'trip', cow: 'S', root: 'B'},
  /* 15 */ {kick: K2, snare: [4, 12, 14, 15], hats: 'trip', cow: 'Sfill', root: 'Cs'},
  /* 16 */ {kick: K1, snare: [4, 12], hats: '16', cow: 'A', root: 'Cs', open: true},
  /* 17 */ {kick: K2, snare: [4, 12], hats: '16', cow: 'B', root: 'A', open: true},
  /* 18 */ {kick: K1, snare: [4, 8, 10, 11, 12, 13, 14, 15], hats: 'roll', cow: 'A', root: 'B', riser: [0, 16], build: true},
  /* 19 */ {kick: [0, 8, 11], snare: [4, 8, 12], hats: '16', cow: 'Hi', root: 'Cs', crash: 0, impact: 8},
  /* 20 */ {kick: [0, 8], snare: [4], hats: 'end', cow: 'End', root: 'Cs', final: 8},
];

// ---------------------------------------------------------------- instruments
const noise = rng(150);

function addKick(buf, t, g = 1) {
  const a = Math.round(t * SR);
  const len = Math.round(0.42 * SR);
  let ph = 0;
  for (let i = 0; i < len && a + i < N; i++) {
    const s = i / SR;
    const f = 46 + 120 * Math.exp(-s / 0.028);
    ph += (TAU * f) / SR;
    const body = Math.sin(ph) * Math.exp(-s / 0.24);
    const click = (noise() * 2 - 1) * Math.exp(-s / 0.0025) * 0.5;
    const v = Math.tanh((body + click) * 1.7) * g;
    buf[0][a + i] += v;
    buf[1][a + i] += v;
  }
}

function addClap(buf, t, g = 1) {
  const a = Math.round(t * SR);
  const len = Math.round(0.3 * SR);
  const bp = [new Biquad('bp', 1700, 0.9), new Biquad('bp', 1900, 0.9)];
  const hp = [new Biquad('hp', 600), new Biquad('hp', 600)];
  let ph = 0;
  for (let i = 0; i < len && a + i < N; i++) {
    const s = i / SR;
    // three tight bursts then a tail, the classic clap envelope
    let env = Math.exp(-s / 0.11) * 0.6;
    for (const o of [0, 0.009, 0.018]) if (s >= o) env += Math.exp(-(s - o) / 0.006) * 0.8;
    ph += (TAU * 185) / SR;
    const body = Math.sin(ph) * Math.exp(-s / 0.045) * 0.5;
    const nL = noise() * 2 - 1;
    const nR = noise() * 2 - 1;
    buf[0][a + i] += (hp[0].run(bp[0].run(nL)) * env * 2.2 + body) * g;
    buf[1][a + i] += (hp[1].run(bp[1].run(nR)) * env * 2.2 + body) * g;
  }
}

function addHat(buf, t, g = 1, open = false, p = 0) {
  const a = Math.round(t * SR);
  const dec = open ? 0.12 : 0.022;
  const len = Math.round((open ? 0.3 : 0.06) * SR);
  const hp = new Biquad('hp', 7500, 0.8);
  const [gl, gr] = pan(p);
  for (let i = 0; i < len && a + i < N; i++) {
    const s = i / SR;
    const v = hp.run(noise() * 2 - 1) * Math.exp(-s / dec) * g;
    buf[0][a + i] += v * gl;
    buf[1][a + i] += v * gr;
  }
}

function addCowbell(buf, t, note, g = 1, dur = 0.16) {
  const a = Math.round(t * SR);
  const len = Math.round((dur + 0.25) * SR);
  const f1 = midi(note);
  const f2 = f1 * 1.4836;
  const hp = new Biquad('hp', 420, 0.7);
  const lp = new Biquad('lp', 4800, 0.7);
  for (let i = 0; i < len && a + i < N; i++) {
    const s = i / SR;
    let sq = 0;
    for (let h = 1; h <= 9; h += 2) sq += (Math.sin(TAU * f1 * h * s) + 0.85 * Math.sin(TAU * f2 * h * s)) / h;
    const env = (Math.exp(-s / 0.012) * 0.55 + Math.exp(-s / dur) * 0.45) * Math.min(1, s / 0.0008);
    const v = lp.run(hp.run(sq)) * env * g * 0.5;
    buf[0][a + i] += v * 0.92;
    buf[1][a + i] += v;
  }
}

/** Mono 808: each note cuts the previous one (5 ms fade), optional glide. */
function render808(notes) {
  const out = stereo(N);
  const lp = new Biquad('lp', 1400, 0.7);
  let ph = 0;
  for (let k = 0; k < notes.length; k++) {
    const nt = notes[k];
    const a = Math.round(nt.t * SR);
    const end = Math.min(N, k + 1 < notes.length ? Math.round(notes[k + 1].t * SR) : a + Math.round(nt.len * SR));
    for (let n = a; n < end; n++) {
      const s = (n - a) / SR;
      let f = midi(nt.note);
      if (nt.glideTo !== undefined && s > nt.glideAt) f = midi(nt.note + (nt.glideTo - nt.note) * Math.min(1, (s - nt.glideAt) / 0.08));
      ph += (TAU * f) / SR;
      const fadeOut = Math.min(1, (end - n) / (0.005 * SR));
      const env = Math.min(1, s / 0.004) * Math.exp(-s / nt.decay) * fadeOut;
      // tanh drive adds harmonics so the bass reads on phone speakers without heavy distortion
      const v = lp.run(Math.tanh(Math.sin(ph) * 2.2) * env * nt.g);
      out[0][n] += v;
      out[1][n] += v;
    }
  }
  return out;
}

function addNoiseSweep(buf, t0, dur, {g = 0.2, fFrom = 400, fTo = 6000, rise = true, panFrom = 0, panTo = 0}) {
  const a = Math.round(t0 * SR);
  const len = Math.round(dur * SR);
  const bp = new Biquad('bp', fFrom, 1.2);
  for (let i = 0; i < len && a + i < N; i++) {
    const u = i / len;
    if (i % 32 === 0) bp.set('bp', fFrom * Math.pow(fTo / fFrom, u), 1.2);
    const env = rise ? Math.pow(u, 2.2) : Math.pow(1 - u, 1.5);
    const v = bp.run(noise() * 2 - 1) * env * g;
    const [gl, gr] = pan(panFrom + (panTo - panFrom) * u);
    buf[0][a + i] += v * gl;
    buf[1][a + i] += v * gr;
  }
}

function addImpact(buf, t, g = 1) {
  addKick(buf, t, 1.1 * g);
  const a = Math.round(t * SR);
  const len = Math.round(1.1 * SR);
  const lp = new Biquad('lp', 900, 0.7);
  let ph = 0;
  for (let i = 0; i < len && a + i < N; i++) {
    const s = i / SR;
    ph += (TAU * (38 + 30 * Math.exp(-s / 0.08))) / SR;
    const sub = Math.sin(ph) * Math.exp(-s / 0.45) * 0.55;
    const crash = lp.run(noise() * 2 - 1) * Math.exp(-s / 0.18) * 0.5;
    buf[0][a + i] += (sub + crash) * g;
    buf[1][a + i] += (sub + crash * 0.9) * g;
  }
}

// ---------------------------------------------------------------- render
const drums = stereo(N);
const cow = stereo(N);
const bassNotes = [];
const markers = [];
const mark = (bar, step, type, note) => markers.push({frame: frameOf(bar, step), time: +tOf(bar, step).toFixed(3), bar, beat: Math.floor(step / 4) + 1, step, type, ...(note ? {note} : {})});

const PHRASES = {1: 'Opening', 3: 'Brand', 5: 'Local discovery', 9: 'Website clarity', 13: 'Answers', 16: 'Personal attention', 19: 'Finish'};

ARR.forEach((b, i) => {
  const bar = i + 1;
  if (PHRASES[bar]) mark(bar, 0, 'phrase', PHRASES[bar]);
  const live = (step) => b.stopAt === undefined || step < b.stopAt;
  const vel = (step) => (step % 4 === 0 ? 1 : 0.8);

  if (b.impact !== undefined) {
    addImpact(drums, tOf(bar, b.impact), bar === 19 ? 1.05 : 0.95);
    mark(bar, b.impact, 'accent', bar === 19 ? 'brand reveal (strongest hit)' : 'brand intro impact');
  }
  if (b.crash !== undefined) {
    addNoiseSweep(drums, tOf(bar, b.crash), 0.7, {g: 0.2, fFrom: 7000, fTo: 1500, rise: false});
    mark(bar, b.crash, 'accent', 'phrase hit: objects compress into the ring');
  }
  for (const s of b.kick) {
    if (!live(s)) continue;
    const g = s === 0 || s === 8 ? 0.95 : 0.72;
    if (b.impact !== s && b.accent !== s && b.final !== s) addKick(drums, tOf(bar, s), g);
    if (s === 0 || s === 8) mark(bar, s, 'kick');
    if (b.final === s) continue;
    const root = ROOT[b.root] + (s === 11 || s === 14 ? 12 : 0);
    bassNotes.push({t: tOf(bar, s), note: root, decay: s === 11 || s === 14 ? 0.12 : 0.34, g: s === 0 ? 0.62 : 0.5, len: 0.6, ...(b.glide !== undefined && s === 8 ? {glideTo: root + 12, glideAt: (b.glide - 8) * STEP} : {})});
  }
  for (const s of b.snare) {
    if (!live(s)) continue;
    const roll = s !== 4 && s !== 12 && !(b.impact === 8 && s === 8);
    const g = roll ? (b.build ? 0.22 + 0.04 * (s - 8) : 0.3) : 0.62;
    addClap(drums, tOf(bar, s), g);
    if (!roll) mark(bar, s, 'snare');
  }
  if (b.accent !== undefined && b.impact !== b.accent) {
    addKick(drums, tOf(bar, b.accent), 1.0);
    addNoiseSweep(drums, tOf(bar, b.accent), 0.5, {g: 0.18, fFrom: 5000, fTo: 900, rise: false});
    mark(bar, b.accent, 'accent', bar === 19 ? 'brand reveal' : 'reassemble');
  }
  // hats
  for (let s = 0; s < 16; s++) {
    if (!live(s) || b.hats === 'stop' && s >= 12) continue;
    if (b.hats === 'end' && s >= 8) break;
    if (b.hats === 'trip') continue;
    if (b.hats === '8' && s % 2) continue;
    if (b.hats === 'roll' && s >= 12) {
      for (let r = 0; r < 2; r++) addHat(drums, tOf(bar, s) + r * STEP * 0.5, 0.1 + 0.02 * (s - 12), false, 0.25);
      continue;
    }
    addHat(drums, tOf(bar, s), (s % 2 ? 0.07 : 0.11) * (b.hats === '8' ? 0.8 : 1), false, s % 2 ? 0.3 : 0.15);
  }
  if (b.hats === 'trip') for (let k = 0; k < 12; k++) addHat(drums, tOf(bar, 0) + k * (STEP * 4) / 3, k % 3 === 0 ? 0.11 : 0.07, false, k % 2 ? 0.3 : -0.1);
  if (b.open) {
    addHat(drums, tOf(bar, 6), 0.06, true, -0.3);
    addHat(drums, tOf(bar, 14), 0.06, true, -0.3);
  }
  // cowbell
  for (const [s, note, len] of COW[b.cow]) if (live(s)) addCowbell(cow, tOf(bar, s), note, 0.75 * vel(s), len ?? 0.16);
  // risers
  if (b.riser) addNoiseSweep(drums, tOf(bar, b.riser[0]), (b.riser[1] - b.riser[0]) * STEP, {g: 0.16, fFrom: 500, fTo: 7000, panFrom: -0.3, panTo: 0.3});
  if (b.final !== undefined) {
    addKick(drums, tOf(bar, b.final), 1.0);
    addClap(drums, tOf(bar, b.final), 0.5);
    bassNotes.push({t: tOf(bar, b.final), note: ROOT.Cs, decay: 0.9, g: 0.62, len: 2});
    mark(bar, b.final, 'accent', 'final resolve');
  }
});

const bass = render808(bassNotes);
// Cowbell: short slapback + a little room, then mono-compatible width.
const cowWet = reverb(cow, {room: 0.7, damp: 0.45, wet: 0.35, pre: 0.008});
const slap = Math.round(STEP * 1.5 * SR);
for (let n = N - 1; n >= slap; n--) {
  cowWet[0][n] += cowWet[1][n - slap] * 0.18;
  cowWet[1][n] += cowWet[0][n - slap] * 0.14;
}
const drumsWet = reverb(drums, {room: 0.55, damp: 0.6, wet: 0.12});

// Stem balance
scale(drumsWet, 0.95);
scale(bass, 0.72);
scale(cowWet, 0.75);

// Voice pocket: a gentle dip where narration intelligibility lives.
const pocket = () => [new Biquad('peak', 2800, 1.0, -3)];
for (const st of [drumsWet, cowWet]) for (const ch of st) {
  const [f] = pocket();
  for (let n = 0; n < N; n++) ch[n] = f.run(ch[n]);
}

const music = stereo(N);
mixInto(music, drumsWet);
mixInto(music, bass);
mixInto(music, cowWet);
// Short fade on the very last 0.25 s so the final resolve doesn't click off.
for (let n = N - Math.round(0.25 * SR); n < N; n++) {
  const g = (N - n) / (0.25 * SR);
  music[0][n] *= g;
  music[1][n] *= g;
  for (const st of [drumsWet, bass, cowWet]) {
    st[0][n] *= g;
    st[1][n] *= g;
  }
}

// Loudness: normalise, measure with ffmpeg (EBU R128), set the mix to TARGET LUFS and
// round off the few peaks above the ceiling. Stems get the same gain so they sum back.
const TARGET = -15;
const norm = 0.5 / peak(music);
scale(music, norm);
writeWav('public/audio/music.wav', music);
const measured = measureLufs('public/audio/music.wav');
const gain = db(TARGET - measured);
softClip(scale(music, gain), 0.85);
writeWav('public/audio/music.wav', music);
for (const [name, st] of [['drums', drumsWet], ['bass', bass], ['cowbell', cowWet]]) writeWav(`public/audio/stems/${name}.wav`, scale(st, norm * gain));

// ---------------------------------------------------------------- SFX (sparse, under the music)
const fx = stereo(N);
for (const c of timeline.sfx) {
  const t = c.frame / FPS;
  const g = c.gain ?? 0.5;
  const dur = (c.dur ?? 10) / FPS;
  switch (c.type) {
    case 'click':
      clickAt(fx, t, g, c.pan ?? 0);
      break;
    case 'swish':
      addNoiseSweep(fx, t, dur, {g: 0.5 * g, fFrom: c.fFrom ?? 700, fTo: c.fTo ?? 4200, rise: false, panFrom: c.panFrom ?? 0, panTo: c.panTo ?? 0});
      addNoiseSweep(fx, t - dur * 0.6, dur * 0.6, {g: 0.35 * g, fFrom: 500, fTo: c.fFrom ?? 700, rise: true, panFrom: c.panFrom ?? 0, panTo: c.panFrom ?? 0});
      break;
    case 'tap':
      tapAt(fx, t, g, c.pan ?? 0);
      break;
    case 'typing':
      for (let i = 0; i < c.chars; i++) clickAt(fx, t + (i * (c.end - c.frame)) / FPS / c.chars, g * (0.6 + 0.4 * noise()), c.pan ?? 0, 3200 + noise() * 1500);
      break;
    default:
      throw new Error(`Unknown sfx ${c.type}`);
  }
}
writeWav('public/audio/sfx.wav', softClip(fx, 0.9));

fs.writeFileSync(
  'src/beats.json',
  JSON.stringify({bpm: BPM, fps: FPS, framesPerBeat: 12, framesPerBar: 48, bars: BARS, markers}, null, 1) + '\n',
);
console.log(`music.wav (${measured.toFixed(1)} -> ${TARGET} LUFS), stems, sfx.wav, beats.json (${markers.length} markers)`);

function clickAt(buf, t, g, p, f = 2600) {
  const a = Math.round(t * SR);
  const bp = new Biquad('bp', f, 1.4);
  const [gl, gr] = pan(p);
  for (let i = 0; i < 0.03 * SR && a + i < N; i++) {
    const s = i / SR;
    const v = (bp.run(noise() * 2 - 1) * Math.exp(-s / 0.006) + Math.sin(TAU * 1100 * s) * Math.exp(-s / 0.008) * 0.3) * g;
    buf[0][a + i] += v * gl;
    buf[1][a + i] += v * gr;
  }
}

function tapAt(buf, t, g, p) {
  const a = Math.round(t * SR);
  const [gl, gr] = pan(p);
  let ph = 0;
  for (let i = 0; i < 0.16 * SR && a + i < N; i++) {
    const s = i / SR;
    ph += (TAU * (150 * Math.exp(-s / 0.05) + 70)) / SR;
    const v = (Math.sin(ph) * Math.exp(-s / 0.05) + (noise() * 2 - 1) * Math.exp(-s / 0.004) * 0.4) * g;
    buf[0][a + i] += v * gl;
    buf[1][a + i] += v * gr;
  }
}

function measureLufs(file) {
  let out = '';
  try {
    execFileSync('ffmpeg', ['-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], {stdio: ['ignore', 'ignore', 'pipe']});
  } catch (e) {
    out = String(e.stderr ?? '');
  }
  if (!out) out = execFileSync('sh', ['-c', `ffmpeg -nostats -i "${file}" -af ebur128 -f null - 2>&1`]).toString();
  const m = [...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  if (!m) throw new Error('Could not measure loudness');
  return parseFloat(m[1]);
}
