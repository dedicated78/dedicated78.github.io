// Render selected seconds to PNG with one bundle (review helper).
// Usage: node scripts/stills.mjs <outDir> <sec> [sec...]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';
const [outDir, ...secs] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const browserExecutable = process.env.REMOTION_BROWSER || undefined;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = {voSrc: null, musicSrc: null, sfxSrc: null};
const composition = await selectComposition({serveUrl, id: 'Episode04', inputProps, browserExecutable});
for (const s of secs.map(Number)) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(s * 30));
  const output = path.join(outDir, `t${s.toFixed(2).padStart(5, '0')}.png`);
  await renderStill({composition, serveUrl, frame, output, inputProps, browserExecutable, chromiumOptions: {gl: 'angle'}});
}
console.log('done');
