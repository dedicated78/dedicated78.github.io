import React from 'react';
import {AbsoluteFill, Audio, useCurrentFrame} from 'remotion';
import {C} from './theme';
import {inWindow} from './lib/anim';
import {S1Search} from './scenes/S1Search';
import {S2Meet} from './scenes/S2Meet';
import {S3Local} from './scenes/S3Local';
import {S4Website} from './scenes/S4Website';
import {S5Answers} from './scenes/S5Answers';
import {S6Approach} from './scenes/S6Approach';
import {S7Reveal} from './scenes/S7Reveal';

export type FilmProps = {
  /** Start the film at this frame (used by the per-scene previews). */
  offset?: number;
  musicSrc: string | null;
  sfxSrc: string | null;
  musicVolume: number;
  sfxVolume: number;
};

// Scenes are stacked in story order. Each one renders slightly before its start so
// it can own the incoming transition (masks, bridges), and unmounts when fully covered.
export const Film: React.FC<FilmProps> = ({offset = 0, musicSrc, sfxSrc, musicVolume, sfxVolume}) => {
  const frame = useCurrentFrame() + offset;
  return (
    <AbsoluteFill style={{background: C.charcoal, overflow: 'hidden'}}>
      {inWindow(frame, 0, 138) && <S1Search frame={frame} />}
      {inWindow(frame, 94, 248) && <S2Meet frame={frame} />}
      {inWindow(frame, 208, 432) && <S3Local frame={frame} />}
      {inWindow(frame, 394, 636) && <S4Website frame={frame} />}
      {inWindow(frame, 604, 830) && <S5Answers frame={frame} />}
      {inWindow(frame, 792, 1026) && <S6Approach frame={frame} />}
      {inWindow(frame, 984, 1200) && <S7Reveal frame={frame} />}

      {musicSrc && offset === 0 && <Audio src={musicSrc} volume={musicVolume} />}
      {sfxSrc && offset === 0 && <Audio src={sfxSrc} volume={sfxVolume} />}
    </AbsoluteFill>
  );
};
