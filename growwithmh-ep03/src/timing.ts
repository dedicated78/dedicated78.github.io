import data from './cues.json';
import {Easing, interpolate} from 'remotion';

// Everything is timed to the real voiceover. Times are seconds on the film timeline
// (voiceover pauses already inserted); see scripts/prepare-audio.mjs.
export const FPS = data.fps;
export const DURATION = data.duration;
export const Q = data.cues;
export const WORDS = data.words as Array<{w: string; s: number; e: number}>;
export const SPEAKERS = data.speakers as Array<{from: number; to: number; who: 'owner' | 'assistant' | 'narrator'}>;
const AMP = data.amp as number[];

/** Voice level 0..1 at time t (smoothed over ±1 frame). */
export const voice = (t: number) => {
  const f = Math.round(t * FPS);
  const a = (i: number) => AMP[Math.max(0, Math.min(AMP.length - 1, i))] ?? 0;
  return (a(f - 1) + 2 * a(f) + a(f + 1)) / 4;
};
export const speakerAt = (t: number) => SPEAKERS.find((s) => t >= s.from && t < s.to)?.who ?? 'narrator';

export type Ease = (x: number) => number;
export const EZ = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 0.8, 0.2),
  back: Easing.bezier(0.3, 1.35, 0.5, 1),
  soft: Easing.bezier(0.25, 0.8, 0.25, 1),
  linear: (x: number) => x,
};
/** 0→1 between seconds a and a+d. */
export const pr = (t: number, a: number, d: number, e: Ease = EZ.out) => interpolate(t, [a, a + Math.max(0.001, d)], [0, 1], {easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
export const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Keyframed pose blending: keys sorted by time; each key may set any subset of fields. */
export function keyed<T extends Record<string, number>>(t: number, base: T, keys: Array<{t: number; d?: number; e?: Ease} & Partial<T>>): T {
  const out = {...base} as Record<string, number>;
  for (const k of keys) {
    const p = pr(t, k.t, k.d ?? 0.3, k.e ?? EZ.out);
    if (p <= 0) continue;
    for (const [name, v] of Object.entries(k)) {
      if (name === 't' || name === 'd' || name === 'e' || typeof v !== 'number') continue;
      out[name] = lerp(out[name], v, p);
    }
  }
  return out as T;
}
