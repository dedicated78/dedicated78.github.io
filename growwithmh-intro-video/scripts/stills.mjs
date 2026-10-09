// Render selected frames to PNG with one bundle (review helper).
// Usage: node scripts/stills.mjs <outDir> <frame> [frame...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const [outDir, ...frames] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = {musicSrc: null, sfxSrc: null, musicVolume: 1, sfxVolume: 1};
const composition = await selectComposition({serveUrl, id: 'GrowwithMHIntro', inputProps, browserExecutable});
for (const f of frames.map(Number)) {
  const output = path.join(outDir, `f${String(f).padStart(4, '0')}.png`);
  await renderStill({composition, serveUrl, frame: f, output, inputProps, browserExecutable, chromiumOptions: {gl: 'angle'}});
  console.log('rendered', output);
}
