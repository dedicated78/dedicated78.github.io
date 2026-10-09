import {continueRender, delayRender} from 'remotion';

// Inter (SIL OFL 1.1) bundled in public/fonts so renders never depend on system fonts.
const FACES: Array<[family: string, file: string, weight: number]> = [
  ['GW Display', 'InterDisplay-Bold.otf', 700],
  ['GW Text', 'Inter-Medium.otf', 500],
  ['GW Text', 'Inter-SemiBold.otf', 600],
  ['GW Text', 'Inter-Bold.otf', 700],
];

let started = false;

/** Loads all faces once; holds rendering until they are ready. */
export const loadFonts = (urlFor: (file: string) => string) => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Loading Inter fonts', {timeoutInMilliseconds: 120000});
  const all = Promise.all(
    FACES.map(([family, file, weight]) =>
      new FontFace(family, `url(${urlFor('fonts/' + file)})`, {weight: String(weight)})
        .load()
        .then((face) => document.fonts.add(face)),
    ),
  );
  // Never let a stalled font request block a render: after 20s fall back to the
  // stack's next family (Inter), which has the same metrics.
  const timeout = new Promise((resolve) => setTimeout(() => resolve('timeout'), 20000));
  Promise.race([all, timeout])
    .then((r) => {
      if (r === 'timeout') console.warn('Font loading is slow; continuing with fallback stack');
    })
    .catch((err) => console.error('Font loading failed', err))
    .finally(() => continueRender(handle));
};
