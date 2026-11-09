// Episode 02 audio preparation. Deterministic; ffmpeg + Node only.
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
  L01: [0, 0], L03: [1, 1], L05: [2, 2], L07: [3, 3], L09: [4, 4], L14: [5, 5],
  L02: [6, 7], L04: [8, 8], L06: [9, 9], L08: [10, 12], L10: [13, 13], L15: [14, 14],
  L11: [15, 15], L12: [16, 16], L13: [17, 18], L16: [19, 20],
};

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
const bounds = transcript.map((seg, i) => (i ? quietCentre(transcript[i - 1].e - 0.1, seg.s + 0.25) : 0));
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
    const target = letters(w);
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
    words.push({w, s: +(s + off).toFixed(3), e: +(e + off).toFixed(3), line: p.id});
  }
  if (k !== ww.length) throw new Error(`${p.id}: ${ww.length - k} transcript words left over`);
}
// refine phrase onsets against the waveform (Whisper starts are often a little early or late)
for (let i = 0; i < words.length; i++) {
  const w = words[i];
  const prevEnd = i ? words[i - 1].e : -1;
  if (w.s - prevEnd > 0.15)
    for (let t = Math.max(prevEnd, w.s - 0.25); t < w.s + 0.15; t += 0.005)
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
  talk1: find('talk', 1, 'L01').s,
  finally: find('finally.', 1, 'L02').s,
  needToTalk: find('we', 1, 'L02').s,
  closed: find('closed?', 1, 'L03').s,
  profile4: find('profile', 1, 'L04').s,
  open4: find('open', 1, 'L04').s,
  sundays4: find('sundays.', 1, 'L04').s,
  sundays5: find('sundays', 1, 'L05').s,
  lastYear: find('last', 1, 'L05').s,
  historical: find('historical', 1, 'L06').s,
  documentary: find('documentary.', 1, 'L06').s,
  anything: find('anything', 1, 'L07').s,
  category8: find('category', 1, 'L08').s,
  general: find('general', 1, 'L08').s,
  roofs: find('you', 1, 'L08').s,
  repair: find('repair', 1, 'L08').s,
  isThat: find('is', 1, 'L08').s,
  best: find('best', 1, 'L08').s,
  figure: find('figure', 1, 'L09').s,
  map: find('map,', 1, 'L10').s,
  unpaid: find('unpaid', 1, 'L10').s,
  manager: find('manager.', 1, 'L10').s,
  describe: find('describe', 1, 'L11').s,
  whatYouDo: find('what', 1, 'L11').s,
  whenAvail: find('when', 1, 'L11').s,
  review: find('review', 1, 'L12').s,
  cat12: find('category,', 1, 'L12').s,
  hours12: find('business', 1, 'L12').s,
  services: find('services,', 1, 'L12').s,
  contact: find('contact', 1, 'L12').s,
  accurate13: find('accurate', 1, 'L13').s,
  decisions: find('decisions.', 1, 'L13').s,
  doesnt: find("doesn't", 1, 'L13').s,
  guarantee: find('guarantee', 1, 'L13').s,
  rankingsEnd: find('rankings.', 1, 'L13').e,
  so14: find('so...', 1, 'L14').s,
  ignoringMe: find('ignoring', 1, 'L14').s,
  me14: find('me?', 1, 'L14').s,
  no15: find('no.', 1, 'L15').s,
  ignoring15: find('ignoring', 1, 'L15').s,
  profile15: find('profile.', 1, 'L15').s,
  grow: find('growwithmh.', 1, 'L16').s,
  getFound: find('get', 1, 'L16').s,
  stay: find('stay', 1, 'L16').s,
  end: words[words.length - 1].e,
});
C.buzz = +(C.L01e + 0.06).toFixed(3); // phone vibrates right after the question
C.emerge = +(C.L01e + 0.55).toFixed(3); // the assistant pops out of the screen
C.outro = +(C.L15e + 0.75).toFixed(3); // end card begins after the freeze
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
    words,
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
    const freezeA = C.L15e + 0.05;
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
// SCENE 01
SFX.buzz(C.buzz, 0.32);
SFX.buzz(C.buzz + 0.4, 0.25);
SFX.notify(C.emerge - 0.05);
SFX.rise(C.emerge, 0.38, 0.09); // pops up out of the screen
SFX.whoosh(C.emerge + 0.42, 0.45, 0.12, -0.1, 0.4); // hops across
SFX.pop(C.emerge + 0.9, 0.3, 0.4); // lands on its map tile
// SCENE 02
SFX.whoosh(C.profile4 - 0.2, 0.35, 0.1, 0.3, 0); // profile card
SFX.notify(C.open4 - 0.02, 0.12, 0); // Sunday: OPEN row lights up
[0, 0.1, 0.2].forEach((d) => SFX.flip(C.sundays4 - 0.05 + d, 0.18, -0.3)); // mini calendar to SUN
SFX.impact(C.lastYear + 0.05, 0.2);
[0, 0.07, 0.14, 0.21, 0.28, 0.35].forEach((d) => SFX.flip(C.historical - 0.1 + d, 0.14, -0.2)); // pages flip backward
SFX.projector(C.documentary - 0.15, 1.6, 0.17);
// SCENE 03
SFX.whoosh(C.L08 - 0.25, 0.4, 0.1, -0.3, 0.3); // camera to the assistant, category card
SFX.notify(C.general + 0.05, 0.1, 0.2);
[0, 0.12, 0.24].forEach((d) => SFX.click(C.repair + 0.05 + d, 0.16, 0.25)); // roofing thumbnails
SFX.pop(C.best + 0.2, 0.22, 0.25); // "Roofing contractor?" chip
SFX.pop(C.unpaid - 0.25, 0.18, 0.3); // paperwork stack appears
SFX.paper(C.manager + 0.05, 0.6, 0.3, 0.2);
// SCENE 04
SFX.whoosh(C.L11 - 0.3, 0.5, 0.12, 0.2, -0.2); // push into the interface
[C.cat12, C.hours12, C.services, C.contact].forEach((t, i) => SFX.click(t, 0.18, [-0.3, -0.1, 0.1, 0.3][i]));
SFX.tick(C.decisions + 0.05);
// SCENE 05
SFX.whoosh(C.L14 - 0.35, 0.4, 0.1, -0.2, 0.2); // back to the two-shot
SFX.whoosh(C.profile15 + 0.25, 0.3, 0.12, 0, 0.5); // the assistant turns away
SFX.boop(C.L15e + 0.12);
// SCENE 06
SFX.logo(C.grow - 0.05, 0.42);

writeWav('public/audio/sfx.wav', fx[0], fx[1]);
const fmt = (x) => x.toFixed(2);
console.log(`VO lines re-sequenced: ${placed.length}; film ${fmt(DUR)} s (${frames} frames); ${words.length} words`);
for (const p of placed) console.log(`  ${p.id} ${p.who.padEnd(9)} src ${fmt(p.clip.on)}-${fmt(p.clip.off)} → film ${fmt(p.at)}-${fmt(p.at + p.len)}`);
