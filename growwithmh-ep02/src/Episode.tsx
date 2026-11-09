import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {FPS, Q} from './timing';
import {Captions} from './components/Text';
import {TwoShot} from './scenes/TwoShot';
import {Lesson, Outro} from './scenes/Lesson';
import {pr} from './timing';

export type EpisodeProps = {voSrc: string | null; musicSrc: string | null; sfxSrc: string | null};

// One set for scenes 01-03 and 05, the lesson interface for 04, the branded outro for 06.
export const Episode: React.FC<EpisodeProps> = ({voSrc, musicSrc, sfxSrc}) => {
  const t = useCurrentFrame() / FPS;
  const on = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{background: C.cream, overflow: 'hidden'}}>
      {on(0, Q.L11 + 0.1) && <TwoShot t={t} />}
      {on(Q.manager + 1.1, Q.L13e + 0.65) && <Lesson t={t} />}
      {on(Q.L13e + 0.25, Q.outro + 0.4) && <TwoShot t={t} fade={pr(t, Q.L13e + 0.3, 0.25)} />}
      {on(Q.outro - 0.05, 999) && <Outro t={t} />}
      <Captions t={t} hideFrom={Q.outro} />
      {voSrc && <Audio src={voSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
      {sfxSrc && <Audio src={sfxSrc} />}
    </AbsoluteFill>
  );
};
