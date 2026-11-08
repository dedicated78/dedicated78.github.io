import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {FPS, Q} from './timing';
import {Captions} from './components/Text';
import {S1Celebration, S2ThreeDaysLater} from './scenes/S1S2';
import {S3Confrontation, S4Assistant} from './scenes/S3S4';
import {S5Explainer, S7Outro} from './scenes/S5S7';

export type EpisodeProps = {voSrc: string | null; musicSrc: string | null; sfxSrc: string | null};

// Scenes overlap slightly so each can own its incoming transition.
export const Episode: React.FC<EpisodeProps> = ({voSrc, musicSrc, sfxSrc}) => {
  const t = useCurrentFrame() / FPS;
  const on = (a: number, b: number) => t >= a && t < b;
  return (
    <AbsoluteFill style={{background: C.cream, overflow: 'hidden'}}>
      {on(0, Q.daysLater + 0.2) && <S1Celebration t={t} />}
      {on(Q.daysLater - 0.2, Q.googleShout + 0.15) && <S2ThreeDaysLater t={t} />}
      {on(Q.googleShout - 0.2, Q.wait + 0.1) && <S3Confrontation t={t} />}
      {on(Q.wait - 0.5, Q.heresThing + 0.2) && <S4Assistant t={t} />}
      {on(Q.heresThing - 0.1, Q.grow + 0.1) && <S5Explainer t={t} />}
      {on(Q.grow - 0.4, 999) && <S7Outro t={t} />}
      <Captions t={t} />
      {voSrc && <Audio src={voSrc} />}
      {musicSrc && <Audio src={musicSrc} volume={0.3} />}
      {sfxSrc && <Audio src={sfxSrc} />}
    </AbsoluteFill>
  );
};
