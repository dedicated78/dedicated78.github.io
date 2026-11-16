import {Easing, interpolate, interpolateColors} from 'remotion';

// Every value in the film is a pure function of the frame number, so seeking,
// preview and export always resolve to the same image.

export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // fast settle, used for most entrances
  soft: Easing.bezier(0.25, 0.8, 0.25, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera moves
  inOutSoft: Easing.bezier(0.45, 0, 0.25, 1),
  in: Easing.bezier(0.55, 0, 0.8, 0.2), // exits
  back: Easing.bezier(0.3, 1.22, 0.55, 1), // restrained overshoot (~4%)
  linear: (t: number) => t,
};

type EaseFn = (t: number) => number;

/** Tween a value from `from` to `to` between frames [start, start + dur]. Clamped both sides. */
export const tw = (
  frame: number,
  start: number,
  dur: number,
  from: number,
  to: number,
  easing: EaseFn = E.out,
): number =>
  interpolate(frame, [start, start + Math.max(1, dur)], [from, to], {
    easing,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** 0 -> 1 progress between frames. */
export const prog = (frame: number, start: number, dur: number, easing: EaseFn = E.out) =>
  tw(frame, start, dur, 0, 1, easing);

/** Multi-keyframe tween, e.g. kf(f, [0, 10, 30], [0, 1, 0.5]). */
export const kf = (frame: number, input: number[], output: number[], easing: EaseFn = E.inOut) =>
  interpolate(frame, input, output, {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Characters of `text` visible at `frame`, typing `framesPerChar` apart from `start`. */
export const typed = (text: string, frame: number, start: number, framesPerChar: number) => {
  const n = Math.floor((frame - start) / framesPerChar) + 1;
  return text.slice(0, clamp(n, 0, text.length));
};

/** Cursor caret blink: 16-frame cycle, deterministic. */
export const caretOn = (frame: number) => Math.floor(frame / 8) % 2 === 0;

/** Seeded pseudo-random in [0, 1) — stable per seed, never Math.random(). */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Visible only while frame is in [a, b). Used to unmount layers outside their window. */
export const inWindow = (frame: number, a: number, b: number) => frame >= a && frame < b;

/** Colour blend for state changes, so nothing snaps between two colours in one frame. */
export const mix = (t: number, from: string, to: string) => interpolateColors(clamp(t), [0, 1], [from, to]);
