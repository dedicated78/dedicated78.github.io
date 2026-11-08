// Episode 01 audio preparation. Deterministic; ffmpeg + Node only.
//
//   node scripts/prepare-audio.mjs
//
// Inputs (not committed):  source/vo.mp3            approved ElevenLabs voiceover (all three roles, one file)
//                          source/music-source.mp3  GrowwithMH music track (optional; omitted if missing)
// Committed input:         src/vo-transcript.json   word timings of the original VO (Whisper small, local)
// Outputs:                 public/audio/vo.wav       VO with two inserted pauses (no words changed)
//                          public/audio/music.wav    music bed (only where the edit calls for it)
//                          public/audio/sfx.wav      synthesized sound effects
//                          src/cues.json             shifted word timings, named cues, lip-sync envelope

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const SR = 48000;
const FPS = 30;
const TAU = Math.PI * 2;

// Pauses added between lines (original VO time, length). Words are never cut or moved inside a line.
const INSERTS = [
  {at: 4.56, dur: 1.2, why: '"3 DAYS LATER" beat before the phone rings'},
  {at: 8.34, dur: 0.9, why: 'comedic silence after "Oh, that is my mom."'},
];
const TAIL = 2.3; // logo hold after the last word
// Who speaks when (original VO time). One voice performs all three roles.
const SPEAKERS = [
  {from: 0, to: 18.2, who: 'owner'},
  {from: 18.2, to: 25.5, who: 'assistant'},
  {from: 25.5, to: 99, who: 'narrator'},
];

const shift = (t) => t + INSERTS.filter((i) => t >= i.at).reduce((a, i) => a + i.dur, 0);

// ---------- decode
const decode = (file, ch = 1) =>
  new Float32Array(new Uint8Array(execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', String(ch), '-ar', String(SR), '-f', 'f32le', '-'], {maxBuffer: 1 << 30})).buffer);
const vo = decode('source/vo.mp3');

// ---------- edited VO
const segs = [];
let prev = 0;
for (const ins of INSERTS) {
  segs.push(vo.subarray(Math.round(prev * SR), Math.round(ins.at * SR)));
  segs.push(new Float32Array(Math.round(ins.dur * SR)));
  prev = ins.at;
}
segs.push(vo.subarray(Math.round(prev * SR)));
const voLen = segs.reduce((a, s) => a + s.length, 0);
const lastWordEnd = shift(42.08);
const DUR = Math.ceil((lastWordEnd + TAIL) * FPS) / FPS;
const N = Math.round(DUR * SR);
const voEd = new Float32Array(N);
{
  let o = 0;
  for (const s of segs) {
    voEd.set(s.subarray(0, Math.max(0, Math.min(s.length, N - o))), o);
    o += s.length;
  }
}

// ---------- words (shifted) with phrase-start onsets refined against the waveform
const rmsAt = (buf, t, win = 0.01) => {
  const a = Math.max(0, Math.round(t * SR));
  const b = Math.min(buf.length, a + Math.round(win * SR));
  let s = 0;
  for (let i = a; i < b; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / Math.max(1, b - a));
};
const transcript = JSON.parse(fs.readFileSync('src/vo-transcript.json', 'utf8'));
const words = [];
for (const seg of transcript)
  for (const w of seg.words) {
    let s = shift(w.s);
    const e = shift(w.e);
    const prevEnd = words.length ? words[words.length - 1].e : -1;
    if (s - prevEnd > 0.15) {
      // first audible 10 ms frame (> -40 dBFS) near Whisper's start
      for (let t = Math.max(prevEnd, s - 0.25); t < s + 0.15; t += 0.005)
        if (rmsAt(voEd, t) > 0.01) {
          s = Math.round(t * 1000) / 1000;
          break;
        }
    }
    words.push({w: w.w, s: +s.toFixed(3), e: +e.toFixed(3)});
  }

// Named cues: n-th occurrence of a word (case-insensitive, punctuation ignored).
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, '');
const find = (text, n = 1) => {
  let k = 0;
  for (const w of words) if (norm(w.w) === norm(text) && ++k === n) return w;
  throw new Error(`cue word not found: ${text} #${n}`);
};
const C = {
  yes: find('yes').s,
  googleVerified: find('google').s,
  rich: find('rich').s,
  richEnd: find('rich').e,
  daysLater: shift(INSERTS[0].at) - INSERTS[0].dur, // start of the inserted pause
  ring: shift(INSERTS[0].at) - INSERTS[0].dur + 0.78,
  firstCustomer: find('my', 2).s,
  customerEnd: find('customer').e,
  oh: find('oh').s,
  momEnd: find('mom').e,
  googleShout: find('google', 2).s,
  youVerified: find('you').s,
  where: find('where').s,
  customersEnd: find('customers').e,
  wait: find('wait').s,
  numberOne: find('number').s,
  numberOneEnd: find('one').e,
  soNo: find('so', 2).s,
  millionaire: find('millionaire').s,
  friday: find('friday').s,
  fridayEnd: find('friday').e,
  sir: find('sir').s,
  manage: find('manage').s,
  manageEnd: find('business', 2).e,
  promise: find('promise').s,
  neighborhood: find('neighborhood').s,
  neighborhoodEnd: find('neighborhood').e,
  notOnMy: find('not').s,
  calendar: find('calendar').s,
  calendarEnd: find('calendar').e,
  heresThing: find("here's").s,
  verification: find('verification').s,
  shortcut: find('shortcut').s,
  top: find('top').e,
  local: find('local').s,
  relevance: find('relevance').s,
  distance: find('distance').s,
  prominence: find('prominence').s,
  prominenceEnd: find('prominence').e,
  start: find('start').s,
  accurate: find('accurate').s,
  category: find('category').s,
  stronger: find('stronger').s,
  presenceEnd: find('presence').e,
  grow: find('grow').s,
  mhEnd: find('mh').e,
  getFound: find('get').s,
  end: words[words.length - 1].e,
};
C.recordStop = +(C.customerEnd + 0.12).toFixed(3);
C.duration = DUR;

// ---------- lip-sync envelope (per frame, 0..1) + speaker per frame
const frames = Math.round(DUR * FPS);
const amp = [];
for (let f = 0; f < frames; f++) amp.push(rmsAt(voEd, f / FPS, 1 / FPS));
const ampMax = Math.max(...amp);
const speakers = SPEAKERS.map((s) => ({from: +shift(s.from).toFixed(3), to: +shift(s.to).toFixed(3), who: s.who}));

fs.writeFileSync(
  'src/cues.json',
  JSON.stringify({fps: FPS, duration: DUR, durationInFrames: frames, inserts: INSERTS, cues: Object.fromEntries(Object.entries(C).map(([k, v]) => [k, +v.toFixed(3)])), speakers, words, amp: amp.map((a) => +(a / ampMax).toFixed(3))}) + '\n',
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
writeWav('public/audio/vo.wav', voEd);

// ---------- music bed: section A under the celebration, tape-stop on the MOM reveal,
// silence through the MOM call and the shout, a low bed under the assistant, full section B
// from the explainer to the logo.
const music = [new Float32Array(N), new Float32Array(N)];
if (fs.existsSync('source/music-source.mp3')) {
  const st = decode('source/music-source.mp3', 2); // interleaved
  const at = (t, c) => st[Math.max(0, Math.round(t * SR)) * 2 + c] || 0;
  const DROP = 39.448; // source drop (downbeat) lands on frame 0
  const B = 55.196; // source phrase start for the explainer
  const stopAt = C.recordStop;
  // A: 0 → stopAt, then 0.45 s tape stop (playback rate falls to 0)
  for (let n = 0; n < Math.round(stopAt * SR); n++) for (let c = 0; c < 2; c++) music[c][n] = at(DROP + n / SR, c);
  let pos = DROP + stopAt;
  const stopLen = Math.round(0.45 * SR);
  for (let i = 0; i < stopLen; i++) {
    const u = i / stopLen;
    const rate = Math.pow(1 - u, 1.6);
    pos += rate / SR;
    const g = 1 - u * 0.3;
    const n = Math.round(stopAt * SR) + i;
    for (let c = 0; c < 2; c++) music[c][n] = at(pos, c) * g;
  }
  // B: a low bed returns as the assistant rises (about -11 dB), swells to full for the
  // explainer, 1.2 s fade out. One continuous read of the source so the phrase lands on b0.
  const b0 = C.heresThing - 0.25;
  const bed = C.wait - 0.1;
  const BED = 0.28;
  for (let n = Math.round(bed * SR); n < N; n++) {
    const t = n / SR;
    const fin = Math.min(1, (t - bed) / 1.0);
    const swell = t < b0 - 0.3 ? BED : BED + (1 - BED) * Math.min(1, (t - (b0 - 0.3)) / 0.35);
    const fout = Math.min(1, (DUR - t) / 1.2);
    for (let c = 0; c < 2; c++) music[c][n] = at(B + (t - b0), c) * fin * swell * fout;
  }
}
writeWav('public/audio/music.wav', music[0], music[1]);

// ---------- SFX (synthesized, restrained)
const fx = [new Float32Array(N), new Float32Array(N)];
let seed = 7;
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
  pop: (t, g = 0.5, p = 0) => add(t, 0.16, (s) => Math.sin(TAU * (620 - 300 * s / 0.16) * s) * Math.exp(-s / 0.04) * Math.min(1, s / 0.003), g, p),
  confetti: (t, g = 0.18) => add(t, 0.6, (s, lp) => lp(rnd(), 0.5) * Math.exp(-s / 0.18) * (0.6 + 0.4 * Math.sin(TAU * 31 * s)), g, 0.2),
  click: (t, g = 0.25, p = 0) => add(t, 0.04, (s, lp) => (rnd() - lp(rnd(), 0.2)) * Math.exp(-s / 0.006), g, p),
  tick: (t, g = 0.18, p = 0) => add(t, 0.05, (s) => Math.sin(TAU * 1900 * s) * Math.exp(-s / 0.012), g, p),
  flip: (t, g = 0.22, p = 0) => add(t, 0.12, (s, lp) => lp(rnd(), 0.35) * Math.sin(Math.PI * Math.min(1, s / 0.12)) * Math.exp(-s / 0.05), g, p),
  whoosh: (t, dur = 0.45, g = 0.2, p0 = 0, p1 = 0) => {
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
      fx[0][a + i] += v * gl;
      fx[1][a + i] += v * gr;
    }
  },
  buzz: (t, dur = 0.45, g = 0.22) => add(t, dur, (s) => (Math.sin(TAU * 150 * s) + 0.4 * Math.sin(TAU * 300 * s)) * (Math.sin(TAU * 12 * s) > -0.2 ? 1 : 0.15) * Math.min(1, s / 0.01) * Math.min(1, (dur - s) / 0.02), g, 0.25),
  scratch: (t, g = 0.35) =>
    add(t, 0.42, (s, lp) => {
      const f = 900 * Math.exp(-s / 0.12) + 120;
      return (Math.sin(TAU * f * s) * 0.6 + lp(rnd(), 0.3) * 0.5) * Math.exp(-s / 0.18) * Math.min(1, s / 0.004);
    }, g, 0),
  impact: (t, g = 0.4) => add(t, 0.5, (s) => Math.sin(TAU * (90 * Math.exp(-s / 0.08) + 45) * s) * Math.exp(-s / 0.16) * Math.min(1, s / 0.004), g, 0),
  rise: (t, dur = 0.6, g = 0.12) => add(t, dur, (s) => Math.sin(TAU * (300 + 500 * (s / dur) ** 2) * s) * Math.sin(Math.PI * (s / dur)) ** 2, g, -0.2),
  logo: (t, g = 0.55) => {
    add(t, 1.6, (s) => (Math.sin(TAU * 55 * s) + 0.5 * Math.sin(TAU * 110 * s) + 0.15 * Math.sin(TAU * 220 * s)) * Math.exp(-s / 0.5) * Math.min(1, s / 0.01), g, 0);
    add(t, 0.05, (s, lp) => (rnd() - lp(rnd(), 0.15)) * Math.exp(-s / 0.008), 0.35, 0);
  },
};
SFX.pop(C.yes + 0.02, 0.55);
SFX.confetti(C.yes + 0.05);
SFX.impact(C.yes + 0.28, 0.18); // VERIFIED stamp lands
SFX.pop(C.rich + 0.05, 0.28, 0.3); // shades on
SFX.whoosh(C.daysLater - 0.1, 0.4, 0.16, 0.4, -0.2);
[0.18, 0.42, 0.66].forEach((d) => SFX.flip(C.daysLater + d, 0.24));
SFX.buzz(C.ring, 0.5);
SFX.buzz(C.ring + 0.95, 0.5);
SFX.whoosh(C.firstCustomer + 0.05, 0.35, 0.12, -0.3, 0.3); // dash to the phone
SFX.scratch(C.recordStop, 0.32);
SFX.whoosh(C.googleShout - 0.12, 0.3, 0.16, 0.3, -0.3); // fast camera turn
[0, 0.15, 0.32].forEach((d, i) => SFX.pop(C.where + d, 0.16, [-0.4, 0.4, 0][i])); // question marks
SFX.rise(C.wait - 0.15, 0.7, 0.1); // assistant rises from the map
SFX.impact(C.numberOne + 0.05, 0.22);
SFX.whoosh(C.soNo + 0.3, 0.35, 0.08, 0.2, -0.1); // calendar drops in
SFX.flip(C.millionaire + 0.02, 0.1); // page lifts on "millionaire"
[0, 0.12].forEach((d) => SFX.flip(C.friday - 0.1 + d, 0.22)); // flips to FRI on "Friday?"
SFX.whoosh(C.sir + 0.25, 0.35, 0.08, -0.2, 0.2); // profile card slides in
SFX.whoosh(C.neighborhood - 0.2, 0.5, 0.12); // map pulls back to the whole neighborhood
SFX.impact(C.calendar + 0.1, 0.3); // punchline
SFX.whoosh(C.heresThing - 0.2, 0.45, 0.14, -0.2, 0.2); // into the explainer
SFX.impact(C.shortcut + 0.02, 0.14); // shortcut crossed out
SFX.whoosh(C.local - 0.05, 0.35, 0.08, 0.2, -0.2); // search panel
[C.relevance, C.distance, C.prominence].forEach((t, i) => SFX.click(t, 0.22, [-0.3, 0, 0.3][i]));
[C.accurate, C.category, C.stronger].forEach((t) => SFX.tick(t + 0.05, 0.14));
SFX.logo(C.grow, 0.5);
writeWav('public/audio/sfx.wav', fx[0], fx[1]);

console.log(`VO ${(vo.length / SR).toFixed(2)} s → ${(voLen / SR).toFixed(2)} s (+${INSERTS.map((i) => i.dur).join(' + ')} s pauses); film ${DUR.toFixed(3)} s, ${frames} frames; ${words.length} words`);
