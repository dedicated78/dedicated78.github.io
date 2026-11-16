import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {FPS, Q, pr} from './timing';
import {Captions} from './components/Text';
import {Set7} from './scenes/Set7';
import {Lesson7} from './scenes/Lesson7';
import {Outro7} from './scenes/Outro7';

export type EpisodeProps = {voSrc: string | null; musicSrc: string | null; sfxSrc: string | null};

// The set (idea → the never-ending name → reality check → panic), the lesson, back to the set
// (clean name, forty-seven words, website copy), the outro.
export const Episode: React.FC<EpisodeProps> = ({voSrc, musicSrc, sfxSrc}) => {
  const t = useCurrentFrame() / FPS;
  const on = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{background: C.cream, overflow: 'hidden'}}>
      {on(0, Q.lessonIn + 0.4) && <Set7 t={t} />}
      {on(Q.lessonIn - 0.1, Q.lessonOut + 0.25) && <Lesson7 t={t} />}
      {on(Q.lessonOut - 0.3, Q.outro + 0.4) && <Set7 t={t} fade={pr(t, Q.lessonOut - 0.3, 0.35)} />}
      {on(Q.outro - 0.05, 999) && <Outro7 t={t} />}
      <Captions t={t} hideFrom={Q.outro} />
      {voSrc && <Audio src={voSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
      {sfxSrc && <Audio src={sfxSrc} />}
    </AbsoluteFill>
  );
};
