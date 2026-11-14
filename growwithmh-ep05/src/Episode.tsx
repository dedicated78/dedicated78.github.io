import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {FPS, Q, pr} from './timing';
import {Captions} from './components/Text';
import {Set5} from './scenes/Set5';
import {Lesson5} from './scenes/Lesson5';
import {Outro5} from './scenes/Outro5';

export type EpisodeProps = {voSrc: string | null; musicSrc: string | null; sfxSrc: string | null};

// The auction set for the story, the paid-vs-organic lesson, the outro.
export const Episode: React.FC<EpisodeProps> = ({voSrc, musicSrc, sfxSrc}) => {
  const t = useCurrentFrame() / FPS;
  const on = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{background: C.cream, overflow: 'hidden'}}>
      {on(0, Q.L10 + 0.1) && <Set5 t={t} />}
      {on(Q.L09e + 0.45, Q.L12e + 0.65) && <Lesson5 t={t} />}
      {on(Q.L12e + 0.25, Q.outro + 0.4) && <Set5 t={t} fade={pr(t, Q.L12e + 0.3, 0.25)} />}
      {on(Q.outro - 0.05, 999) && <Outro5 t={t} />}
      <Captions t={t} hideFrom={Q.outro} />
      {voSrc && <Audio src={voSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
      {sfxSrc && <Audio src={sfxSrc} />}
    </AbsoluteFill>
  );
};
