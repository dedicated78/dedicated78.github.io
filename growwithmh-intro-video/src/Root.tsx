import React from 'react';
import {Composition, Folder, staticFile} from 'remotion';
import {Film} from './Film';
import {loadFonts} from './fonts';
import timeline from './timeline.json';

loadFonts((file) => staticFile(file));

const SCENE_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'] as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="GrowwithMHIntro"
      component={Film}
      durationInFrames={timeline.durationInFrames}
      fps={timeline.fps}
      width={1080}
      height={1920}
      defaultProps={{
        musicSrc: staticFile('audio/music.wav'),
        sfxSrc: staticFile('audio/sfx.wav'),
        musicVolume: 1,
        sfxVolume: 1,
      }}
    />
    {/* Per-scene previews (with neighbouring transition frames) for quick review in Studio. */}
    <Folder name="Scenes">
      {SCENE_IDS.map((id) => {
        const s = timeline.scenes[id];
        const from = Math.max(0, s.start - 15);
        const to = Math.min(timeline.durationInFrames, s.end + 15);
        return (
          <Composition
            key={id}
            id={`Scene-${id.toUpperCase()}`}
            component={Film}
            durationInFrames={to - from}
            fps={timeline.fps}
            width={1080}
            height={1920}
            defaultProps={{offset: from, musicSrc: null, sfxSrc: null, musicVolume: 1, sfxVolume: 1}}
          />
        );
      })}
    </Folder>
  </>
);
