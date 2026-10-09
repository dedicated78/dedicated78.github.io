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
  s1: '“Your customers are searching. Let’s help them find you.”',
  s2: '“Meet GrowwithMH, independent SEO consulting led by Mehedi Hassan.”',
  s3: '“From Google Maps to local search, I help customers discover your business.”',
  s4: '“With technical SEO and clearer content, your website can work harder.”',
  s5: '“I also help prepare your content for answer engines and AI search.”',
  s6: '“It starts with your business, clear priorities and steady improvements.”',
  s7: '“Ready to get found? Visit growwithmh dot com. Let’s grow with M H.”',
};
const SCENES = Object.entries(timeline.scenes).map(([id, s]) => ({id, ...s}));
const fmt = (f: number) => `0:${String(Math.floor(f / 30)).padStart(2, '0')}`;

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
                onClick={() => ref.current?.seekTo(s.start + (i === 0 ? 0 : 6))}
              >
                <span className="t">{fmt(s.start)}</span>
                <span className="n">{s.name}</span>
              </button>
            </li>
          ))}
        </ol>
        <p className="note">Narration isn’t baked in. The track you hear is the original music bed and sound effects, with room left for your voice.</p>
      </aside>
    </div>
  );
};

createRoot(document.getElementById('app')!).render(<App />);
