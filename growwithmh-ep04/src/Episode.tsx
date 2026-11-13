import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {FPS, Q, pr} from './timing';
import {Captions} from './components/Text';
import {Set4} from './scenes/Set4';
import {Request4} from './scenes/Request4';
import {Outro4} from './scenes/Outro4';

export type EpisodeProps = {voSrc: string | null; musicSrc: string | null; sfxSrc: string | null};

// One set for the story, an illustrative request screen for "how to get real reviews", the outro.
export const Episode: React.FC<EpisodeProps> = ({voSrc, musicSrc, sfxSrc}) => {
  const t = useCurrentFrame() / FPS;
  const on = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{background: C.cream, overflow: 'hidden'}}>
      {on(0, Q.L11 + 0.1) && <Set4 t={t} />}
      {on(Q.L10e + 0.45, Q.L11e + 0.65) && <Request4 t={t} />}
      {on(Q.L11e + 0.25, Q.outro + 0.4) && <Set4 t={t} fade={pr(t, Q.L11e + 0.3, 0.25)} />}
      {on(Q.outro - 0.05, 999) && <Outro4 t={t} />}
      <Captions t={t} hideFrom={Q.outro} />
      {voSrc && <Audio src={voSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
      {sfxSrc && <Audio src={sfxSrc} />}
    </AbsoluteFill>
  );
};
