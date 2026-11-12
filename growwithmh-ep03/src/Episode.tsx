import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {FPS, Q, pr} from './timing';
import {Captions} from './components/Text';
import {Set3} from './scenes/Set3';
import {Lesson3, Outro3} from './scenes/Lesson3';

export type EpisodeProps = {voSrc: string | null; musicSrc: string | null; sfxSrc: string | null};

// One set for sequences A–D and F, the lesson for E, the branded outro for G.
export const Episode: React.FC<EpisodeProps> = ({voSrc, musicSrc, sfxSrc}) => {
  const t = useCurrentFrame() / FPS;
  const on = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{background: C.cream, overflow: 'hidden'}}>
      {on(0, Q.L10 + 0.1) && <Set3 t={t} />}
      {on(Q.L09e + 0.5, Q.L13e + 0.65) && <Lesson3 t={t} />}
      {on(Q.L13e + 0.25, Q.outro + 0.4) && <Set3 t={t} fade={pr(t, Q.L13e + 0.3, 0.25)} />}
      {on(Q.outro - 0.05, 999) && <Outro3 t={t} />}
      <Captions t={t} hideFrom={Q.outro} />
      {voSrc && <Audio src={voSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
      {sfxSrc && <Audio src={sfxSrc} />}
    </AbsoluteFill>
  );
};
