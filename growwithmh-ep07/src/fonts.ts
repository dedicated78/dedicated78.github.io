import {continueRender, delayRender} from 'remotion';

// Poppins (display) + Inter (text), both SIL OFL, bundled in public/fonts.
const FACES: Array<[string, string, string, string?]> = [
  ['GW Display', 'InterDisplay-Bold.otf', '700'],
  ['GW Poppins', 'poppins-latin-600-normal.woff2', '600'],
  ['GW Poppins', 'poppins-latin-600-italic.woff2', '600', 'italic'],
  ['GW Poppins', 'poppins-latin-700-normal.woff2', '700'],
  ['GW Poppins', 'poppins-latin-800-normal.woff2', '800'],
  ['GW Text', 'Inter-Medium.otf', '500'],
  ['GW Text', 'Inter-SemiBold.otf', '600'],
  ['GW Text', 'Inter-Bold.otf', '700'],
];
let started = false;
export const loadFonts = (urlFor: (f: string) => string) => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const h = delayRender('fonts', {timeoutInMilliseconds: 120000});
  const all = Promise.all(FACES.map(([fam, file, weight, style]) => new FontFace(fam, `url(${urlFor('fonts/' + file)})`, {weight, style: style ?? 'normal'}).load().then((f) => document.fonts.add(f))));
  Promise.race([all, new Promise((r) => setTimeout(r, 20000))]).catch(() => undefined).finally(() => continueRender(h));
};
