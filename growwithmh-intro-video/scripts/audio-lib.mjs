// Small deterministic DSP toolkit shared by the music and SFX generators.
import fs from 'node:fs';
import path from 'node:path';

export const SR = 48000;
export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const db = (d) => Math.pow(10, d / 20);

/** Seeded PRNG (mulberry32). */
export const rng = (seed) => {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const stereo = (n) => [new Float32Array(n), new Float32Array(n)];

/** Equal-power pan, -1 (left) .. 1 (right). */
export const pan = (p) => {
  const a = ((clamp(p, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
};

/** RBJ biquad. Types: lp, hp, bp, peak (gain dB), hshelf (gain dB). */
export class Biquad {
  constructor(type = 'lp', f = 1000, q = 0.707, gain = 0) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(type, f, q, gain);
  }
  set(type, f, q = 0.707, gain = 0) {
    const w = (TAU * clamp(f, 10, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const sn = Math.sin(w);
    const al = sn / (2 * q);
    const A = Math.pow(10, gain / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (type) {
      case 'hp':
        [b0, b1, b2, a0, a1, a2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + al, -2 * cs, 1 - al];
        break;
      case 'bp':
        [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cs, 1 - al];
        break;
      case 'peak':
        [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cs, 1 - al * A, 1 + al / A, -2 * cs, 1 - al / A];
        break;
      case 'hshelf': {
        const s = 2 * Math.sqrt(A) * al;
        b0 = A * (A + 1 + (A - 1) * cs + s);
        b1 = -2 * A * (A - 1 + (A + 1) * cs);
        b2 = A * (A + 1 + (A - 1) * cs - s);
        a0 = A + 1 - (A - 1) * cs + s;
        a1 = 2 * (A - 1 - (A + 1) * cs);
        a2 = A + 1 - (A - 1) * cs - s;
        break;
      }
      default:
        [b0, b1, b2, a0, a1, a2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2, 1 + al, -2 * cs, 1 - al];
    }
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
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

/** Apply a filter chain in place to a stereo buffer. */
export const filterStereo = (buf, make) => {
  for (const ch of buf) {
    const fs_ = make();
    for (let n = 0; n < ch.length; n++) {
      let v = ch[n];
      for (const f of fs_) v = f.run(v);
      ch[n] = v;
    }
  }
  return buf;
};

/** Freeverb-style stereo reverb returning a new buffer (dry + wet). */
export function reverb([L, R], {room = 0.8, damp = 0.4, wet = 0.25, pre = 0.01} = {}) {
  const N = L.length;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const k = SR / 44100;
  const make = (spread) => ({
    combs: combT.map((t) => ({b: new Float32Array(Math.round((t + spread) * k)), i: 0, f: 0})),
    aps: apT.map((t) => ({b: new Float32Array(Math.round((t + spread) * k)), i: 0})),
  });
  const ch = [make(0), make(23)];
  const preN = Math.round(pre * SR);
  const out = stereo(N);
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

export const mixInto = (dst, src, gain = 1) => {
  for (let c = 0; c < 2; c++) for (let n = 0; n < dst[c].length; n++) dst[c][n] += src[c][n] * gain;
  return dst;
};

export const peak = ([L, R]) => {
  let p = 0;
  for (let n = 0; n < L.length; n++) p = Math.max(p, Math.abs(L[n]), Math.abs(R[n]));
  return p;
};

export const scale = (buf, g) => {
  for (const ch of buf) for (let n = 0; n < ch.length; n++) ch[n] *= g;
  return buf;
};

/** Gentle soft clipper: transparent below ~-6 dBFS, rounds peaks above. */
export const softClip = (buf, ceiling = 0.89) => {
  for (const ch of buf)
    for (let n = 0; n < ch.length; n++) {
      const x = ch[n] / ceiling;
      ch[n] = (Math.abs(x) < 0.6 ? x : Math.sign(x) * (0.6 + 0.4 * Math.tanh((Math.abs(x) - 0.6) / 0.4))) * ceiling;
    }
  return buf;
};

export function writeWav(file, [L, R]) {
  const N = L.length;
  const data = Buffer.alloc(N * 4);
  for (let n = 0; n < N; n++) {
    data.writeInt16LE(Math.round(clamp(L[n], -1, 1) * 32767), n * 4);
    data.writeInt16LE(Math.round(clamp(R[n], -1, 1) * 32767), n * 4 + 2);
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
