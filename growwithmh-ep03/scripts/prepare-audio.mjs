// Episode 03 audio preparation. Deterministic; ffmpeg + Node only.
//
//   node scripts/prepare-audio.mjs
//
// Inputs (not committed):  source/vo-upload.mp3     approved ElevenLabs VO (all lines, grouped by character)
//                          (music: an original bed is synthesized below; no music file is needed)
// Committed inputs:        src/script.json           the approved script, line order and comedic gaps
//                          src/vo-transcript.json    word timings of the upload (local Whisper small)
// Outputs:                 public/audio/vo.wav       lines cut at their silences and re-sequenced in script
//                                                    order (no word edited, trimmed, sped up or reordered)
//                          public/audio/music.wav    understated bed
//                          public/audio/sfx.wav      synthesized sound effects
//                          src/cues.json             word timings on the film timeline, named cues, lip-sync envelope

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const SR = 48000;
const FPS = 30;
const TAU = Math.PI * 2;
const script = JSON.parse(fs.readFileSync('src/script.json', 'utf8'));
const transcript = JSON.parse(fs.readFileSync('src/vo-transcript.json', 'utf8'));

// Which transcript segments hold each script line (the upload is grouped by speaker).
const SRC = {
  L01: [0, 0], L02: [1, 1], L04: [2, 2], L06: [3, 3], L14: [4, 4], L08: [5, 5],
  L03: [6, 6], L05: [7, 7], L07: [8, 8], L09: [9, 9], L15: [10, 10],
  L10: [11, 11], L11: [12, 12], L12: [13, 13], L13: [14, 14], L16: [15, 15],
};
// Where the local transcript disagrees with the approved script word (flagged for review).
const ALIAS = {L06: {clicked: 'could'}};

// ---------- decode
const decode = (file, ch = 1) =>
  new Float32Array(new Uint8Array(execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', String(ch), '-ar', String(SR), '-f', 'f32le', '-'], {maxBuffer: 1 << 30})).buffer);
const up = decode('source/vo-upload.mp3');
const rms = (buf, t, win = 0.01) => {
  const a = Math.max(0, Math.round(t * SR));
  const b = Math.min(buf.length, a + Math.round(win * SR));
  let s = 0;
  for (let i = a; i < b; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const GATE = 0.006; // about -44 dBFS

// ---------- cut each line at the centre of the real silence around it, then trim to the audible span
const quietCentre = (a, b) => {
  // centre of the longest run below the gate between a and b (seconds)
  let best = [a, a];
  let runStart = -1;
  for (let t = a; t <= b; t += 0.005) {
    const q = rms(up, t) < GATE;
    if (q && runStart < 0) runStart = t;
    if ((!q || t + 0.005 > b) && runStart >= 0) {
      if (t - runStart > best[1] - best[0]) best = [runStart, t];
      runStart = -1;
    }
  }
  return (best[0] + best[1]) / 2;
};
// Whisper can stretch a phrase's first word back over the pause before it, so search up to the end
// of that first word for the real silence.
const bounds = transcript.map((seg, i) => (i ? quietCentre(transcript[i - 1].e - 0.1, Math.min(seg.words[0].e, seg.s + 0.8)) : 0));
bounds.push(up.length / SR);
const clips = {};
for (const line of script.lines) {
  const [a, b] = SRC[line.id];
  const ws = [];
  for (let i = a; i <= b; i++) ws.push(...transcript[i].words);
  const lo = bounds[a];
  const hi = bounds[b + 1];
  let on = lo;
  while (on < hi && rms(up, on) < GATE) on += 0.005;
  let off = hi;
  while (off > on && rms(up, off - 0.01) < GATE) off -= 0.005;
  on = Math.max(lo, on - 0.03);
  off = Math.min(hi, off + 0.08, ws[ws.length - 1].e + 0.3);
  const pcm = up.slice(Math.round(on * SR), Math.round(off * SR));
  // 6 ms fade in, 40 ms fade out: no clicks at the cut points
  const fi = Math.round(0.006 * SR);
  const fo = Math.round(0.04 * SR);
  for (let i = 0; i < fi && i < pcm.length; i++) pcm[i] *= i / fi;
  for (let i = 0; i < fo && i < pcm.length; i++) pcm[pcm.length - 1 - i] *= i / fo;
  clips[line.id] = {pcm, on, off, words: ws};
}

// ---------- lay out in script order
const placed = [];
let cursor = script.leadIn;
for (const line of script.lines) {
  const c = clips[line.id];
  placed.push({...line, at: cursor, len: c.pcm.length / SR, clip: c});
  cursor += c.pcm.length / SR + line.gapAfter;
}
const DUR = Math.ceil((cursor + script.tail) * FPS) / FPS;
const N = Math.round(DUR * SR);
const vo = new Float32Array(N);
for (const p of placed) vo.set(p.clip.pcm.subarray(0, Math.min(p.clip.pcm.length, N - Math.round(p.at * SR))), Math.round(p.at * SR));

// ---------- script words → Whisper timings (matched by letters, so "GrowwithMH." spans "Grow with MH.")
const letters = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
const words = [];
for (const p of placed) {
  const sw = p.text.split(/\s+/);
  const ww = p.clip.words;
  let k = 0;
  for (const w of sw) {
    const target = letters(ALIAS[p.id]?.[letters(w)] ?? w);
    let acc = '';
    const s = ww[k].s;
    let e = ww[k].e;
    while (k < ww.length && acc.length < target.length) {
      acc += letters(ww[k].w);
      e = ww[k].e;
      k++;
    }
    if (acc !== target) throw new Error(`${p.id}: script word "${w}" does not match transcript "${acc}"`);
    const off = p.at - p.clip.on;
    // a word can never start before its own clip (Whisper sometimes stretches a phrase start backwards)
    words.push({w, s: +Math.max(p.at, s + off).toFixed(3), e: +(e + off).toFixed(3), line: p.id, first: k === 1 || undefined});
  }
  if (k !== ww.length) throw new Error(`${p.id}: ${ww.length - k} transcript words left over`);
}
// refine phrase onsets against the waveform (Whisper starts are often a little early or late)
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  const prevEnd = i ? words[i - 1].e : -1;
  if (w.s - prevEnd > 0.15 || words[i].first)
    for (let t = Math.max(prevEnd, w.s - 0.25); t < Math.max(w.s + 0.15, w.first ? w.e - 0.05 : 0); t += 0.005)
      if (rms(vo, t) > 0.01) {
        w.s = +t.toFixed(3);
        break;
      }
}

// ---------- cues
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
const find = (text, n = 1, line) => {
  let k = 0;
  for (const w of words) if ((!line || w.line === line) && norm(w.w) === norm(text) && ++k === n) return w;
  throw new Error(`cue word not found: ${text} #${n} ${line ?? ''}`);
};
const C = {};
for (const p of placed) {
  const lw = words.filter((w) => w.line === p.id);
  C[p.id] = lw[0].s;
  C[`${p.id}e`] = lw[lw.length - 1].e;
}
Object.assign(C, {
  didIt: find('it!', 1, 'L01').s,
  added: find('added', 1, 'L01').s,
  twenty1: find('20', 1, 'L01').s,
  profile1: find('profile.', 1, 'L01').s,
  brooklyn: find('brooklyn,', 1, 'L02').s,
  queens: find('queens,', 1, 'L02').s,
  manhattan: find('manhattan.', 1, 'L02').s,
  takingOver: find('taking', 1, 'L02').s,
  newYork: find('new', 1, 'L02').s,
  congrats: find('congratulations.', 1, 'L03').s,
  madeList: find('you', 1, 'L03').s,
  list: find('list.', 1, 'L03').s,
  rank4: find('rank', 1, 'L04').s,
  all20: find('all', 1, 'L04').s,
  setting: find('service', 1, 'L05').s,
  notA: find('not', 1, 'L05').s,
  teleport: find('teleportation', 1, 'L05').s,
  clicked: find('clicked', 1, 'L06').s,
  save: find('save!', 1, 'L06').s,
  thumb: find('thumb', 1, 'L07').s,
  perfectly: find('perfectly.', 1, 'L07').s,
  accomplish: find('accomplish?', 1, 'L08').s,
  told: find('told', 1, 'L09').s,
  willing: find('willing', 1, 'L09').s,
  adding: find('adding', 1, 'L10').s,
  automatically: find('automatically', 1, 'L10').s,
  rankings: find('rankings.', 1, 'L10').s,
  relevance: find('relevance,', 1, 'L11').s,
  distance: find('distance,', 1, 'L11').s,
  prominence: find('prominence.', 1, 'L11').s,
  choose: find('choose', 1, 'L12').s,
  serve: find('serve.', 1, 'L12').s,
  accurate: find('accurate', 1, 'L13').s,
  stronger: find('stronger', 1, 'L13').s,
  famous: find('famous', 1, 'L14').s,
  everywhere: find('everywhere?', 1, 'L14').s,
  zero: find('zero', 1, 'L15').s,
  superpowers: find('superpowers.', 1, 'L15').s,
  grow: find('growwithmh.', 1, 'L16').s,
  getFound: find('get', 1, 'L16').s,
  smarter: find('grow', 1, 'L16').s,
  end: words[words.length - 1].e,
});
C.rise = +(C.L02e + 0.55).toFixed(3); // the assistant rises from its map tile (Episode 01 entrance)
C.freeze = +(C.rise - 0.08).toFixed(3); // the fantasy freezes as it appears
C.portalTry = +(C.L05e + 0.25).toFixed(3); // he steps toward the portal
C.portalPop = +(C.L05e + 0.85).toFixed(3); // the portal collapses into a map pin
C.outro = +(C.L15e + 0.75).toFixed(3);
C.duration = DUR;

// ---------- lip-sync envelope + speakers
const frames = Math.round(DUR * FPS);
const amp = [];
for (let f = 0; f < frames; f++) amp.push(rms(vo, f / FPS, 1 / FPS));
const ampMax = Math.max(...amp);
const speakers = placed.map((p, i) => ({from: +(i ? p.at - 0.05 : 0).toFixed(3), to: +(placed[i + 1] ? placed[i + 1].at - 0.05 : 999).toFixed(3), who: p.who}));

fs.writeFileSync(
  'src/cues.json',
  JSON.stringify({
    fps: FPS,
    duration: DUR,
    durationInFrames: frames,
    lines: placed.map((p) => ({id: p.id, who: p.who, at: +p.at.toFixed(3), len: +p.len.toFixed(3), srcIn: +p.clip.on.toFixed(3), srcOut: +p.clip.off.toFixed(3)})),
    cues: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, +v.toFixed(3)])),
    speakers,
    words: words.map(({first, ...w}) => w),
    amp: amp.map((a) => +(a / ampMax).toFixed(3)),
  }) + '\n',
);

// ---------- WAV writer
const writeWav = (file, L, R = L) => {
  const data = Buffer.alloc(L.length * 4);
  for (let n = 0; n < L.length; n++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[n])) * 32767), n * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[n])) * 32767), n * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.mkdirSync('public/audio', {recursive: true});
  fs.writeFileSync(file, Buffer.concat([h, data]));
};
writeWav('public/audio/vo.wav', vo);

// ---------- music: an understated original bed (soft Rhodes-like chords + a muted pulse), 96 BPM.
// It drops out for the comedic freeze after "ignoring your profile" and the end card has its own sting.
const music = [new Float32Array(N), new Float32Array(N)];
{
  const BPM = 96;
  const beat = 60 / BPM;
  const bar = beat * 4;
  const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
  const prog = [
    [57, 60, 64, 67], // Am7
    [53, 57, 60, 64], // Fmaj7
    [48, 55, 60, 64], // C add9-ish voicing
    [55, 59, 62, 66], // G6/maj7 colour
  ];
  const bass = [45, 41, 48, 43];
  const env = (t) => {
    // overall level: in from 0, out for the freeze, gone before the end-card sting
    const fin = Math.min(1, t / 0.6);
    const freezeA = C.L15e + 0.05; // music drops out for the final comedic pause
    const out1 = t < freezeA ? 1 : Math.max(0, 1 - (t - freezeA) / 0.25);
    return fin * out1;
  };
  for (let n = 0; n < N; n++) {
    const t = n / SR;
    const g = env(t);
    if (g <= 0) continue;
    const bi = Math.floor(t / bar);
    const tb = t - bi * bar;
    const ch = prog[bi % 4];
    let v = 0;
    // pad: soft attack per bar, slow decay
    const pa = Math.min(1, tb / 0.25) * Math.exp(-tb / 3.2);
    for (const m of ch) {
      const f = mtof(m);
      v += (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t + 0.3) + 0.08 * Math.sin(TAU * f * 3 * t)) * pa * 0.06;
    }
    // muted pulse on each beat: short sine pluck on the chord root an octave up
    const tbe = t % beat;
    const pl = Math.exp(-tbe / 0.09) * Math.min(1, tbe / 0.004);
    v += Math.sin(TAU * mtof(ch[0] + 12) * t) * pl * 0.05;
    // bass on beats 1 and 3
    const th = t % (beat * 2);
    v += Math.sin(TAU * mtof(bass[bi % 4]) * t) * Math.exp(-th / 0.35) * Math.min(1, th / 0.01) * 0.11;
    const w = Math.sin(TAU * 0.15 * t) * 0.15;
    music[0][n] = v * g * (1 - w * 0.5);
    music[1][n] = v * g * (1 + w * 0.5);
  }
}
// end card: one soft resolving chord under the logo, fading out exactly on the last frame
{
  const a = C.grow - 0.05;
  const notes = [48, 55, 59, 62, 64, 67].map((m) => 440 * 2 ** ((m - 69) / 12));
  for (let n = Math.round(a * SR); n < N; n++) {
    const t = n / SR - a;
    const env = Math.min(1, t / 0.6) * Math.min(1, (DUR - a - t) / 1.8);
    let v = 0;
    for (const f of notes) v += (Math.sin(TAU * f * (a + t)) + 0.2 * Math.sin(TAU * 2 * f * (a + t))) * 0.045;
    const w = Math.sin(TAU * 0.2 * t) * 0.12;
    music[0][n] += v * env * (1 - w);
    music[1][n] += v * env * (1 + w);
  }
}
writeWav('public/audio/music.wav', music[0], music[1]);

// ---------- SFX (synthesized, restrained)
const fx = [new Float32Array(N), new Float32Array(N)];
let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const panG = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];
const add = (t0, len, fn, gain = 1, pan = 0) => {
  const a = Math.round(t0 * SR);
  const [gl, gr] = panG(pan);
  let lp = 0;
  for (let i = 0; i < Math.round(len * SR) && a + i < N; i++) {
    const v = fn(i / SR, (x, k) => (lp += k * (x - lp))) * gain;
    if (a + i >= 0) {
      fx[0][a + i] += v * gl;
      fx[1][a + i] += v * gr;
    }
  }
};
const SFX = {
  pop: (t, g = 0.4, p = 0) => add(t, 0.16, (s) => Math.sin(TAU * (620 - 300 * s / 0.16) * s) * Math.exp(-s / 0.04) * Math.min(1, s / 0.003), g, p),
  click: (t, g = 0.22, p = 0) => add(t, 0.04, (s, lp) => (rnd() - lp(rnd(), 0.2)) * Math.exp(-s / 0.006), g, p),
  tick: (t, g = 0.16, p = 0) => add(t, 0.05, (s) => Math.sin(TAU * 1900 * s) * Math.exp(-s / 0.012), g, p),
  flip: (t, g = 0.2, p = 0) => add(t, 0.12, (s, lp) => lp(rnd(), 0.35) * Math.sin(Math.PI * Math.min(1, s / 0.12)) * Math.exp(-s / 0.05), g, p),
  whoosh: (t, dur = 0.45, g = 0.16, p0 = 0, p1 = 0) => {
    const a = Math.round(t * SR);
    let lp1 = 0;
    let lp2 = 0;
    for (let i = 0; i < Math.round(dur * SR) && a + i < N; i++) {
      const u = i / (dur * SR);
      const k = 0.02 + 0.25 * Math.sin(Math.PI * u);
      lp1 += k * (rnd() - lp1);
      lp2 += 0.02 * (lp1 - lp2);
      const v = (lp1 - lp2) * Math.sin(Math.PI * u) ** 1.5 * g * 3;
      const [gl, gr] = panG(p0 + (p1 - p0) * u);
      if (a + i >= 0) {
        fx[0][a + i] += v * gl;
        fx[1][a + i] += v * gr;
      }
    }
  },
  // phone vibration: 170 Hz motor with a rough edge, gated on/off
  buzz: (t, dur = 0.42, g = 0.24) => add(t, dur, (s) => (Math.sin(TAU * 170 * s) + 0.35 * Math.sin(TAU * 340 * s + 1)) * (Math.sin(TAU * 11 * s) > -0.3 ? 1 : 0.1) * Math.min(1, s / 0.01) * Math.min(1, (dur - s) / 0.02), g, 0.15),
  // light digital notification: two soft sine blips a fifth apart
  notify: (t, g = 0.16, p = 0.1) => {
    add(t, 0.18, (s) => Math.sin(TAU * 1175 * s) * Math.exp(-s / 0.05) * Math.min(1, s / 0.003), g, p);
    add(t + 0.085, 0.24, (s) => Math.sin(TAU * 1760 * s) * Math.exp(-s / 0.07) * Math.min(1, s / 0.003), g * 0.85, p);
  },
  // vintage projector: shutter clatter (~18 per second) over a low motor whir and a little hiss
  projector: (t, dur = 1.4, g = 0.2) =>
    add(t, dur, (s, lp) => {
      const ph = (s * 18) % 1;
      const clack = Math.exp(-ph / 0.06) * (rnd() * 0.8);
      const whir = Math.sin(TAU * 62 * s) * 0.25 + Math.sin(TAU * 124 * s) * 0.08;
      const hiss = lp(rnd(), 0.6) * 0.06;
      return (clack + whir + hiss) * Math.min(1, s / 0.12) * Math.min(1, (dur - s) / 0.25);
    }, g, -0.15),
  // paper sliding across a surface: band-limited noise with a friction flutter
  paper: (t, dur = 0.55, g = 0.3, p = -0.3) =>
    add(t, dur, (s, lp) => {
      const u = s / dur;
      return (rnd() - lp(rnd(), 0.08)) * Math.sin(Math.PI * u) ** 1.2 * (0.75 + 0.25 * Math.sin(TAU * 37 * s)) * 0.6;
    }, g, p),
  // abrupt interruption: short record-scratch (from Episode 01)
  scratch: (t, g = 0.3) =>
    add(t, 0.42, (s, lp) => {
      const f = 900 * Math.exp(-s / 0.12) + 120;
      return (Math.sin(TAU * f * s) * 0.6 + lp(rnd(), 0.3) * 0.5) * Math.exp(-s / 0.18) * Math.min(1, s / 0.004);
    }, g, 0),
  impact: (t, g = 0.3) => add(t, 0.5, (s) => Math.sin(TAU * (90 * Math.exp(-s / 0.08) + 45) * s) * Math.exp(-s / 0.16) * Math.min(1, s / 0.004), g, 0),
  rise: (t, dur = 0.6, g = 0.1) => add(t, dur, (s) => Math.sin(TAU * (300 + 500 * (s / dur) ** 2) * s) * Math.sin(Math.PI * (s / dur)) ** 2, g, 0.2),
  // comedic "boop" as the assistant turns away: a short downward sine glide
  boop: (t, g = 0.24) => add(t, 0.26, (s) => Math.sin(TAU * (520 - 760 * s) * s) * Math.exp(-s / 0.09) * Math.min(1, s / 0.004), g, 0.2),
  // end-card sonic logo: soft low bloom + a gentle two-note chime-free bell (sine partials)
  logo: (t, g = 0.4) => {
    add(t, 1.8, (s) => (Math.sin(TAU * 55 * s) + 0.5 * Math.sin(TAU * 110 * s) + 0.12 * Math.sin(TAU * 220 * s)) * Math.exp(-s / 0.55) * Math.min(1, s / 0.01), g, 0);
    add(t, 0.05, (s, lp) => (rnd() - lp(rnd(), 0.15)) * Math.exp(-s / 0.008), 0.25, 0);
    add(t + 0.02, 2.0, (s) => (Math.sin(TAU * 392 * s) * 0.6 + Math.sin(TAU * 587.3 * s) * 0.4) * Math.exp(-s / 0.7) * Math.min(1, s / 0.02), g * 0.18, 0);
  },
};
// A · the great expansion
SFX.pop(C.L01 + 0.05, 0.3, -0.2); // celebratory pop on "I did it!"
[0, 0.18, 0.36, 0.54, 0.72].forEach((d, i) => SFX.click(C.added + d, 0.16, 0.3)); // counter steps 01 → 20
[0, 0.12, 0.24, 0.36, 0.48, 0.6].forEach((d, i) => SFX.tick(C.twenty1 + 0.3 + d, 0.1, 0.3 - i * 0.1)); // pins land
// B · the imaginary empire
[C.brooklyn, C.queens, C.manhattan].forEach((t, i) => SFX.pop(t + 0.04, 0.2, [-0.2, 0.2, 0][i])); // borough pins
SFX.rise(C.takingOver - 0.1, 0.6, 0.08); // crown appears
SFX.notify(C.newYork + 0.1, 0.1, 0); // spotlight on
// C · reality check
SFX.scratch(C.freeze, 0.22); // abrupt fantasy interruption
SFX.whoosh(C.rise - 0.05, 0.6, 0.1, 0.4, 0.2); // the assistant rises
SFX.impact(C.rise + 0.55, 0.16); // crown hits the floor
SFX.flip(C.list - 0.1, 0.18, 0.2); // pins fold into a checklist
[0, 0.08, 0.16].forEach((d) => SFX.tick(C.list + 0.15 + d, 0.1, 0.2));
SFX.rise(C.teleport - 0.15, 0.7, 0.07); // portal opens
SFX.whoosh(C.portalTry, 0.35, 0.1, -0.2, 0); // he steps toward it
SFX.boop(C.portalPop, 0.22); // portal collapses
SFX.pop(C.portalPop + 0.18, 0.22, 0); // into a small map pin
// D · but I clicked save
SFX.notify(C.L06 - 0.2, 0.14, 0.2); // SAVED confirmation
SFX.pop(C.thumb + 0.05, 0.22, 0.3); // thumbs-up icon
SFX.impact(C.perfectly + 0.6, 0.12); // small comedic impact on the pause
// E · the lesson
SFX.whoosh(C.L10 - 0.35, 0.5, 0.12, 0.2, -0.2);
[C.relevance, C.distance, C.prominence].forEach((t, i) => SFX.click(t, 0.18, [-0.3, 0, 0.3][i]));
SFX.tick(C.serve, 0.12);
[C.accurate, C.stronger].forEach((t) => SFX.tick(t + 0.05, 0.12));
// F · punchline
SFX.whoosh(C.L14 - 0.35, 0.4, 0.1, -0.2, 0.2);
SFX.pop(C.zero, 0.2, -0.2); // tiny cape appears
SFX.whoosh(C.superpowers + 0.35, 0.35, 0.08, -0.1, -0.3); // ...and slips off
SFX.boop(C.L15e + 0.15, 0.2);
// G · outro
SFX.logo(C.grow - 0.05, 0.42);

writeWav('public/audio/sfx.wav', fx[0], fx[1]);
const fmt = (x) => x.toFixed(2);
console.log(`VO lines re-sequenced: ${placed.length}; film ${fmt(DUR)} s (${frames} frames); ${words.length} words`);
for (const p of placed) console.log(`  ${p.id} ${p.who.padEnd(9)} src ${fmt(p.clip.on)}-${fmt(p.clip.off)} → film ${fmt(p.at)}-${fmt(p.at + p.len)}`);
