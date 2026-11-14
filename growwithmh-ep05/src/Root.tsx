import React from 'react';
import {Composition, staticFile} from 'remotion';
import {loadFonts} from './fonts';
import {Episode} from './Episode';
import cues from './cues.json';

loadFonts((f) => staticFile(f));

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Episode05"
      component={Episode}
      durationInFrames={cues.durationInFrames}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{voSrc: staticFile('audio/vo.wav'), musicSrc: staticFile('audio/music.wav'), sfxSrc: staticFile('audio/sfx.wav')}}
    />
  </>
);
