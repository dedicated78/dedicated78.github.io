// Fits the supplied music track to the film's 150 BPM edit without touching any animation.
//
//   node scripts/prepare-music.mjs
//
// Input:  public/audio/source/music-source.mp3   (the client-supplied track, 121.92 BPM)
// Output: public/audio/music.wav                 (48 kHz stereo, exactly 32.000 s, −15 LUFS)
//         src/beats.json                         (beat / phrase markers on the film's grid)
//
// Analysis of the source (beat grid fitted across the whole track):
//   tempo 121.924 BPM (beat 492.1 ms), first downbeat 0.0802 s, snare/clap on beats 2 + 4,
//   8-bar phrases. Bars 16–19 (31.58–39.45 s) are a breakdown; the groove drops back in on
//   bar 20 (39.45 s). Further phrase starts: bar 28 (55.20 s), bar 36 (70.94 s). The song's
//   final decaying bar starts on bar 83 (163.46 s).
//
// Fit: the track is time-stretched to 150 BPM with pitch preserved (rubberband), so every
// beat of the music lands on the film's 12-frame beat grid. Placement:
//   film 0.0–30.4 s  = source bars 18–37 (last 2 bars of the breakdown → drop → 2 phrases)
//                      → the drop hits the brand impact at 3.2 s, and the source's next two
//                        phrase starts hit the layer slam (16.0 s) and the phrase hit (28.8 s)
//   film 30.4–32.0 s = source bar 83, the song's own ending, spliced on the bar line, so the
//                      CTA holds over a real musical ending instead of a fade.

import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const SRC = 'public/audio/source/music-source.mp3';
const OUT = 'public/audio/music.wav';
const SRC_BPM = 121.924;
const SRC_FIRST_DOWNBEAT = 0.0802; // seconds
const FILM_BPM = 150;
const FPS = 30;
const DUR = 32;
const TARGET_LUFS = -15; // same level as the previous music bed, so the SFX balance is unchanged

const beat = 60 / SRC_BPM;
const bar = 4 * beat;
const R = FILM_BPM / SRC_BPM; // tempo ratio (1.2303)
const barAt = (n) => SRC_FIRST_DOWNBEAT + n * bar; // n = 0-based source bar index

const A0 = barAt(18); // two bars before the drop
const A1 = barAt(38); // 20 source bars → 32.0 s at 150 BPM, we use the first 30.4 s (19 bars)
const SPLICE = 30.4; // film time of the splice (bar 20 downbeat)
const B0 = barAt(83); // the song's final bar

if (!fs.existsSync(SRC)) {
  console.error(`Missing ${SRC}. Copy the supplied track there first.`);
  process.exit(1);
}

const tmp = 'public/audio/.music-raw.wav';
const stretch = `rubberband=tempo=${R.toFixed(6)}:pitch=1:transients=crisp:detector=percussive:phase=laminar:window=standard`;
const graph = [
  `[0:a]atrim=start=${A0.toFixed(6)}:end=${A1.toFixed(6)},asetpts=PTS-STARTPTS,${stretch},aresample=48000,atrim=0:${SPLICE},apad=whole_dur=${SPLICE},afade=t=out:st=${(SPLICE - 0.012).toFixed(3)}:d=0.012[a]`,
  `[0:a]atrim=start=${B0.toFixed(6)},asetpts=PTS-STARTPTS,${stretch},aresample=48000,afade=t=in:d=0.006[b]`,
  `[a][b]concat=n=2:v=0:a=1,atrim=0:${DUR},apad=whole_dur=${DUR},afade=t=in:d=0.003,afade=t=out:st=${DUR - 0.12}:d=0.12[m]`,
].join(';');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-filter_complex', graph, '-map', '[m]', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', tmp]);

// Loudness: measure, then gain + limiter (−1.5 dBFS ceiling).
const measure = (file) => {
  const out = execFileSync('sh', ['-c', `ffmpeg -nostats -i "${file}" -af ebur128 -f null - 2>&1`]).toString();
  return parseFloat([...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
};
const before = measure(tmp);
const gainDb = TARGET_LUFS - before;
execFileSync('ffmpeg', [
  '-v', 'error', '-y', '-i', tmp,
  '-af', `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.84:attack=2:release=40:level=false,atrim=0:${DUR}`,
  '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', OUT,
]);
fs.rmSync(tmp);
const after = measure(OUT);

// Markers on the film's grid (1 beat = 12 frames, 1 bar = 48 frames). Kick on beats 1 + 3,
// snare/clap on 2 + 4 (as in the source), plus the musical landmarks of this edit.
const markers = [];
const fpb = (60 / FILM_BPM) * FPS;
for (let b = 0; b < (DUR * FILM_BPM) / 60; b++) {
  const frame = Math.round(b * fpb);
  const barN = Math.floor(b / 4) + 1;
  const beatN = (b % 4) + 1;
  markers.push({frame, time: +(frame / FPS).toFixed(3), bar: barN, beat: beatN, step: (beatN - 1) * 4, type: beatN % 2 ? 'kick' : 'snare'});
}
const land = (frame, note, type = 'accent') => markers.push({frame, time: +(frame / FPS).toFixed(3), bar: Math.floor(frame / 48) + 1, beat: Math.floor((frame % 48) / 12) + 1, step: 0, type, note});
land(0, 'Opening: last two bars of the source breakdown', 'phrase');
land(96, 'Drop: groove returns (source bar 20) — brand impact');
land(480, 'Source phrase start (bar 28) — layers reassemble');
land(864, 'Source phrase start (bar 36) — phrase hit, cut to the reveal');
land(912, 'Splice to the song’s final bar (source bar 83) — ending', 'phrase');
markers.sort((a, b) => a.frame - b.frame || (a.type === 'accent' || a.type === 'phrase' ? 1 : -1));
fs.writeFileSync(
  'src/beats.json',
  JSON.stringify(
    {
      bpm: FILM_BPM,
      fps: FPS,
      framesPerBeat: 12,
      framesPerBar: 48,
      bars: 20,
      source: {file: 'music-source.mp3', bpm: SRC_BPM, firstDownbeat: SRC_FIRST_DOWNBEAT, tempoRatio: +R.toFixed(6), used: [{from: +A0.toFixed(3), to: +(A0 + SPLICE * R).toFixed(3), film: [0, SPLICE]}, {from: +B0.toFixed(3), film: [SPLICE, DUR]}]},
      markers,
    },
    null,
    1,
  ) + '\n',
);
console.log(`music.wav: source ${A0.toFixed(3)}–${(A0 + SPLICE * R).toFixed(3)} s + ${B0.toFixed(3)} s → end, stretched ×${R.toFixed(4)}; ${before.toFixed(1)} → ${after.toFixed(1)} LUFS`);
