// Episode 05 audio preparation. Deterministic; ffmpeg + Node only.
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

// Each script line names its span in the transcript: [segment, first word, last word]. The upload is
// grouped by speaker and some lines share a segment, so lines are addressed word by word.
const ALIAS = {};
const wordsOf = ([seg, w0, w1]) => transcript[seg].words.slice(w0, w1 + 1);

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
// Every span in the source (used lines and the omitted one), in source order; each line is bounded by
// the real silence between it and its neighbours. Whisper can stretch a phrase's first word back over
// the pause before it, so the search runs up to the end of that first word.
const spans = [...script.lines.map((l) => ({id: l.id, ws: wordsOf(l.src)})), ...(script.omitted ?? []).map((o, i) => ({id: `omit${i}`, ws: wordsOf(o.src)}))].sort((a, b) => a.ws[0].s - b.ws[0].s);
const clips = {};
spans.forEach((sp, i) => {
  if (sp.id.startsWith('omit')) return;
  const ws = sp.ws;
  const prev = spans[i - 1];
  const next = spans[i + 1];
  const lo = prev ? quietCentre(prev.ws[prev.ws.length - 1].e - 0.1, Math.min(ws[0].e, ws[0].s + 0.8)) : 0;
  const hi = next ? quietCentre(ws[ws.length - 1].e - 0.1, Math.min(next.ws[0].e, next.ws[0].s + 0.8)) : up.length / SR;
  let on = lo;
  while (on < hi && rms(up, on) < GATE) on += 0.005;
  let off = hi;
  while (off > on && rms(up, off - 0.01) < GATE) off -= 0.005;
  on = Math.max(lo, on - 0.03);
  off = Math.min(hi, off + 0.08, ws[ws.length - 1].e + 1.0);
  const pcm = up.slice(Math.round(on * SR), Math.round(off * SR));
  // 6 ms fade in, 40 ms fade out: no clicks at the cut points
  const fi = Math.round(0.006 * SR);
  const fo = Math.round(0.04 * SR);
  for (let k = 0; k < fi && k < pcm.length; k++) pcm[k] *= k / fi;
  for (let k = 0; k < fo && k < pcm.length; k++) pcm[pcm.length - 1 - k] *= k / fo;
  clips[sp.id] = {pcm, on, off, words: ws};
});

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
    words.push({w, s: +Math.max(p.at, s + off).toFixed(3), e: +Math.min(p.at + p.len, e + off).toFixed(3), line: p.id, first: k === 1 || undefined});
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
  welcome: find('welcome', 1, 'L01').s,
  numberOne1: find('number', 1, 'L01').s,
  auction: find('auction!', 1, 'L01').s,
  bid100: find('$100!', 1, 'L02').s,
  bid500: find('$500!', 1, 'L03').s,
  roofing: find('roofing', 1, 'L03').s,
  numberOne3: find('number', 1, 'L03').s,
  sold500: find('$500!', 1, 'L04').s,
  once: find('once,', 1, 'L04').s,
  twice: find('twice,', 1, 'L04').s,
  sold: find('sold!', 1, 'L04').s,
  yes: find('yes!', 1, 'L05').s,
  finally: find('finally!', 1, 'L05').s,
  domination: find('domination!', 1, 'L05').s,
  sponsored6: find('sponsored?', 1, 'L06').s,
  advertising7: find('advertising,', 1, 'L07').s,
  notAn: find('not', 1, 'L07').s,
  organicSpot: find('organic', 1, 'L08').s,
  checkout: find('checkout', 1, 'L09').s,
  numberOne9: find('number', 1, 'L09').s,
  paidAds: find('paid', 1, 'L10').s,
  sponsored10: find('sponsored,', 1, 'L10').s,
  doesnt: find("doesn't", 1, 'L11').s,
  higher: find('higher', 1, 'L11').s,
  relevance: find('relevance,', 1, 'L12').s,
  distance: find('distance,', 1, 'L12').s,
  prominence: find('prominence.', 1, 'L12').s,
  anAd: find('ad...', 1, 'L13').s,
  trophy13: find('trophy.', 1, 'L13').s,
  nonRefundable: find('non-refundable.', 1, 'L14').s,
  grow: find('growwithmh.', 1, 'L15').s,
  getFound: find('get', 1, 'L15').s,
  smarter: find('grow', 1, 'L15').s,
  end: words[words.length - 1].e,
});
// story beats derived from the words
C.won = +(C.sold + 0.25).toFixed(3); // AUCTION WON! banner after the gavel
C.stop = +(C.L05e + 0.2).toFixed(3); // the celebration stops: music cut, push-in to the listing
C.reveal = +(C.stop + 0.35).toFixed(3); // "Sponsored" label appears
C.rise = +(C.L06e + 0.15).toFixed(3); // the Maps Assistant rises only after his question
C.shrink = +(C.L14e + 0.2).toFixed(3); // trophy shrinks into a tiny icon
C.outro = +(C.L14e + 0.8).toFixed(3);
C.silenceA = 0;
C.silenceB = 0; // (no mandatory silence in this episode)
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
// MANDATORY COMEDIC SILENCE: nothing at all between silenceA and silenceB (VO zeroed here; music and
// SFX are zeroed at the same span below before they are written)
const silence = (buf) => buf.fill(0, Math.round(C.silenceA * SR), Math.round(C.silenceB * SR));
silence(vo);
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
    // auction energy at the top; an abrupt stop when the celebration halts; ducked low through the
    // discovery and the comedic pause; a quiet return under the explanation; out for the final beat
    const fin = Math.min(1, t / 0.4);
    if (t < C.stop) return fin;
    if (t < C.L07) return 0;
    const back = 0.45 * Math.min(1, (t - C.L07) / 1.5);
    const out1 = t < C.L14e + 0.05 ? 1 : Math.max(0, 1 - (t - C.L14e - 0.05) / 0.3);
    return back * out1;
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
silence(music[0]);
silence(music[1]);
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
  // small mechanical servo: buzzy saw-ish tone with a gentle pitch glide
  servo: (t, dur = 0.5, g = 0.1) =>
    add(t, dur, (s) => {
      const f = 210 + 60 * Math.sin(Math.PI * (s / dur));
      const ph = (f * s) % 1;
      return ((ph * 2 - 1) * 0.5 + Math.sin(TAU * f * 2 * s) * 0.3) * Math.sin(Math.PI * (s / dur)) ** 1.5;
    }, g, 0.4),
  // scanning beam: soft high shimmer
  scan: (t, dur = 0.8, g = 0.06) =>
    add(t, dur, (s) => (Math.sin(TAU * (1600 + 300 * Math.sin(TAU * 3 * s)) * s) * 0.6 + Math.sin(TAU * 2400 * s) * 0.2) * Math.sin(Math.PI * (s / dur)) ** 2, g, 0.4),
  // wooden gavel: a sharp knock with a short body resonance
  gavel: (t, g = 0.45) => {
    add(t, 0.03, (s, lp) => (rnd() - lp(rnd(), 0.3)) * Math.exp(-s / 0.004), g * 0.9, 0);
    add(t, 0.35, (s) => (Math.sin(TAU * 180 * s) * 0.7 + Math.sin(TAU * 410 * s) * 0.3) * Math.exp(-s / 0.06) * Math.min(1, s / 0.002), g, 0);
  },
  // soft room tone with a faint, unintelligible crowd murmur (no words)
  room: (t, dur, g = 0.05) =>
    add(t, dur, (s, lp) => {
      const m = 0.6 + 0.4 * Math.sin(TAU * 0.7 * s) * Math.sin(TAU * 0.23 * s + 1);
      return lp(rnd(), 0.06) * m * Math.min(1, s / 0.5) * Math.min(1, (dur - s) / 0.15);
    }, g, 0),
  // shrinking: descending soft glide
  shrink: (t, g = 0.18) => add(t, 0.55, (s) => Math.sin(TAU * (900 - 1300 * s) * s) * Math.exp(-s / 0.25) * Math.min(1, s / 0.01), g, 0.2),
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
// 01 · auction: room ambience, bid notifications
SFX.room(0, C.stop, 0.05);
SFX.notify(C.bid100 + 0.2, 0.12, -0.2); // $100 on the board
SFX.notify(C.bid500 + 0.1, 0.14, 0.2); // $500 on the board
[0, 0.06, 0.12, 0.18, 0.24].forEach((d) => SFX.click(C.bid500 + 0.15 + d, 0.12, 0.2)); // counter races up
SFX.tick(C.once + 0.05, 0.1, -0.2);
SFX.tick(C.twice + 0.05, 0.1, 0.2);
SFX.gavel(C.sold + 0.02, 0.45); // SOLD!
SFX.pop(C.won, 0.24, 0); // AUCTION WON! banner
// 03 · celebration
SFX.pop(C.yes, 0.26, -0.2);
SFX.rise(C.finally, 0.6, 0.07); // listing rises to the top
SFX.notify(C.domination, 0.1, 0.2); // crown + trophy
// 04 · discovery: music interrupted, then the Sponsored label
SFX.scratch(C.stop, 0.22);
SFX.tick(C.reveal + 0.05, 0.12, 0.2);
// 05 · Maps Assistant
SFX.rise(C.rise, 0.6, 0.07);
SFX.whoosh(C.checkout - 0.3, 0.4, 0.1, 0.3, 0); // checkout panel
SFX.boop(C.numberOne9 + 0.1, 0.2); // checkout cancelled: NOT FOR SALE
SFX.impact(C.numberOne9 + 0.15, 0.12);
// 06 · lesson
SFX.whoosh(C.L10 - 0.35, 0.5, 0.12, 0.2, -0.2);
SFX.click(C.paidAds, 0.16, -0.3);
SFX.click(C.higher, 0.16, 0.3);
[C.relevance, C.distance, C.prominence].forEach((t, i) => SFX.click(t, 0.16, [-0.3, 0, 0.3][i]));
// 07 · punchline: the trophy shrinks
SFX.whoosh(C.L13 - 0.35, 0.4, 0.1, -0.2, 0.2);
SFX.shrink(C.shrink, 0.18);
// outro
SFX.impact(C.outro + 0.08, 0.14); // statement chip lands: ORGANIC RANKINGS AREN'T FOR SALE.
SFX.whoosh(C.grow - 0.3, 0.45, 0.08, -0.2, 0.2); // chip lifts away for the lockup
SFX.logo(C.grow - 0.05, 0.42);

silence(fx[0]);
silence(fx[1]);
writeWav('public/audio/sfx.wav', fx[0], fx[1]);
const fmt = (x) => x.toFixed(2);
console.log(`VO lines re-sequenced: ${placed.length}; film ${fmt(DUR)} s (${frames} frames); ${words.length} words`);
for (const p of placed) console.log(`  ${p.id} ${p.who.padEnd(9)} src ${fmt(p.clip.on)}-${fmt(p.clip.off)} → film ${fmt(p.at)}-${fmt(p.at + p.len)}`);
