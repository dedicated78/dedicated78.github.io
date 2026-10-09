// Builds the standalone browser preview into player/dist (page + bundle + fonts + compressed audio).
//   node scripts/build-player.mjs
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const out = 'player/dist';
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(`${out}/fonts`, {recursive: true});
fs.mkdirSync(`${out}/audio`, {recursive: true});

await build({
  entryPoints: ['player/entry.tsx'],
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2020',
  outfile: `${out}/app.js`,
  define: {'process.env.NODE_ENV': '"production"'},
  loader: {'.json': 'json'},
});

for (const f of fs.readdirSync('public/fonts')) if (f.endsWith('.otf')) fs.copyFileSync(`public/fonts/${f}`, `${out}/fonts/${f}`);
for (const n of ['music', 'sfx']) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', `public/audio/${n}.wav`, '-c:a', 'libmp3lame', '-b:a', '160k', `${out}/audio/${n}.mp3`]);
}
fs.copyFileSync('player/index.html', `${out}/index.html`);
console.log('Built', out);
