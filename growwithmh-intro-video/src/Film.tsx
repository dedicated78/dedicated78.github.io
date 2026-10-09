import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {inWindow} from './lib/anim';
import {RingLayer} from './components/RingLayer';
import {S1Problem} from './scenes/S1Problem';
import {S2Brand} from './scenes/S2Brand';
import {S3Local} from './scenes/S3Local';
import {S4Website} from './scenes/S4Website';
import {S5Answers} from './scenes/S5Answers';
import {S6Personal} from './scenes/S6Personal';
import {S7Reveal} from './scenes/S7Reveal';

export type FilmProps = {
  /** Start the film at this frame (used by the per-scene previews). */
  offset?: number;
  musicSrc: string | null;
  sfxSrc: string | null;
  musicVolume: number;
  sfxVolume: number;
};

// Scenes stack in story order. Each mounts a little before its first bar so it can own the
// incoming transition, and unmounts once fully covered. The search ring is one layer on top.
export const Film: React.FC<FilmProps> = ({offset = 0, musicSrc, sfxSrc, musicVolume, sfxVolume}) => {
  const frame = useCurrentFrame() + offset;
  return (
    <AbsoluteFill style={{background: C.charcoal, overflow: 'hidden'}}>
      {inWindow(frame, 0, 102) && <S1Problem frame={frame} />}
      {inWindow(frame, 84, 190) && <S2Brand frame={frame} />}
      {inWindow(frame, 166, 390) && <S3Local frame={frame} />}
      {inWindow(frame, 370, 576) && <S4Website frame={frame} />}
      {inWindow(frame, 552, 720) && <S5Answers frame={frame} />}
      {inWindow(frame, 720, 864) && <S6Personal frame={frame} />}
      {inWindow(frame, 864, 960) && <S7Reveal frame={frame} />}
      <RingLayer frame={frame} />

      {musicSrc && offset === 0 && <Audio src={musicSrc} volume={musicVolume} />}
      {sfxSrc && offset === 0 && <Audio src={sfxSrc} volume={sfxVolume} />}
    </AbsoluteFill>
  );
};
