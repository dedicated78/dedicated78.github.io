// Browser preview: the same <Film> composition in @remotion/player, with scene jumps and
// the voiceover script synced to the playhead. Built to player/dist by scripts/build-player.mjs.
import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Player, PlayerRef} from '@remotion/player';
import {Film} from '../src/Film';
import {loadFonts} from '../src/fonts';
import timeline from '../src/timeline.json';

loadFonts((file) => file);

const VO: Record<string, string> = {
  s1: '“Great at what you do, but hard to find online?”',
  s2: '“Meet GrowwithMH. SEO consulting by Mehedi Hassan.”',
  s3: '“Help nearby customers discover your business through local SEO and Google Business Profile optimization.”',
  s4: '“Strengthen your website with technical SEO and clear service content.”',
  s5: '“Prepare your content for answer engines and AI search.”',
  s6: '“Work directly with me, from research to action.”',
  s7: '“Let’s improve your search presence. Visit growwithmh dot com.”',
};
const SCENES = Object.entries(timeline.scenes).map(([id, s]) => ({id, ...s}));
const fmt = (f: number) => `0:${(f / 30).toFixed(1).padStart(4, '0')}`;

const App: React.FC = () => {
  const ref = useRef<PlayerRef>(null);
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const p = ref.current;
    if (!p) return;
    const on = (e: {detail: {frame: number}}) => setFrame(e.detail.frame);
    p.addEventListener('frameupdate', on);
    return () => p.removeEventListener('frameupdate', on);
  }, []);
  const current = SCENES.find((s) => frame >= s.start && frame < s.end) ?? SCENES[SCENES.length - 1];
  return (
    <div className="layout">
      <div className="stage">
        <Player
          ref={ref}
          component={Film}
          inputProps={{musicSrc: 'audio/music.mp3', sfxSrc: 'audio/sfx.mp3', musicVolume: 1, sfxVolume: 1}}
          durationInFrames={timeline.durationInFrames}
          fps={timeline.fps}
          compositionWidth={1080}
          compositionHeight={1920}
          controls
          clickToPlay
          style={{width: '100%', aspectRatio: '9 / 16', borderRadius: 18, overflow: 'hidden'}}
        />
      </div>
      <aside className="side">
        <p className="eyebrow">Voiceover · {fmt(current.start)}–{fmt(current.end)}</p>
        <p className="vo" aria-live="polite">{VO[current.id]}</p>
        <ol className="scenes">
          {SCENES.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                id={`scene-${s.id}`}
                className={s.id === current.id ? 'on' : ''}
                onClick={() => ref.current?.seekTo(s.start + (i === 0 ? 0 : 4))}
              >
                <span className="t">{fmt(s.start)}</span>
                <span className="n">{s.name}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="note">Narration isn’t baked in. The track is an original 150 BPM phonk instrumental (one bar = 1.6 s); every scene starts on a bar line.</p>
      </aside>
    </div>
  );
};

createRoot(document.getElementById('app')!).render(<App />);
