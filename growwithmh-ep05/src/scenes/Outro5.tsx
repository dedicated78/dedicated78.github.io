import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {C, FONT_DISPLAY} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Obj} from '../components/Card3D';
import {Icon} from '../components/Icons';
import {Wordmark3D} from '../components/Text';
import {LogoTile} from '../props/Ep02Props';
import {Studio, World} from './common';

// =============================================================== GROWWITHMH OUTRO (Episode 02–03 end card)
const LOGO = {size: 290, cy: 560};
const WM = {size: 104, cy: 845};
const DOT = {x: 540 + 345, y: WM.cy + 26};

export const Outro5: React.FC<{t: number}> = ({t}) => {
  // the check flies in only once the statement chip has lifted away (it becomes the wordmark dot)
  const A = Q.grow - 0.1;
  const fly = pr(t, A, 0.5, EZ.inOut);
  const logoIn = pr(t, Q.grow - 0.15, 0.6, EZ.back);
  const reveal = pr(t, Q.grow + 0.05, 0.55, EZ.inOut);
  const settle = pr(t, Q.grow, 0.8, EZ.out);
  const gx = lerp(560, DOT.x, fly);
  const gy = lerp(1150, DOT.y, fly);
  const gd = lerp(84, WM.size * 0.2, pr(t, A + 0.3, 0.35, EZ.inOut));
  const dotOn = t >= A + 0.55;
  const chipIn = pr(t, Q.outro + 0.05, 0.4, EZ.back);
  const chipUp = pr(t, Q.grow - 0.25, 0.6, EZ.inOut);
  const l1 = pr(t, Q.getFound, 0.4, EZ.back);
  const l2 = pr(t, Q.smarter, 0.4, EZ.back);
  const sweep = pr(t, Q.grow + 0.45, 0.9, EZ.inOut);
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.outro - 0.05, 0.3)}}>
      <Studio haloY={LOGO.cy + 140} floorY={1520} />
      {sweep > 0 && sweep < 1 && <div style={{position: 'absolute', left: lerp(-300, 1200, sweep) - 160, top: WM.cy - 200, width: 320, height: 400, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(23,97,90,0.22), rgba(183,216,197,0))'}} />}
      <World cam={{x: 540, y: 900, s: 1 + 0.02 * pr(t, Q.grow, 5, EZ.linear)}} perspective={1600}>
        {logoIn > 0 && (
          <Obj cx={540} cy={LOGO.cy} w={LOGO.size} h={LOGO.size} pose={{ry: lerp(-80, 0, logoIn) + Math.sin(t * 0.9) * 3 * settle, rx: lerp(20, 0, logoIn), s: lerp(0.6, 1, logoIn), z: lerp(-300, 0, logoIn)}}>
            <LogoTile size={LOGO.size} ry={lerp(-80, 0, logoIn)} />
          </Obj>
        )}
        <div style={{position: 'absolute', left: 0, right: 0, top: WM.cy - WM.size * 0.6, height: WM.size * 1.2, display: 'flex', justifyContent: 'center', alignItems: 'center', transformStyle: 'preserve-3d'}}>
          <Wordmark3D size={WM.size} rx={lerp(28, 0, settle)} ry={lerp(-10, 0, settle)} clipRight={lerp(700, 0, reveal)} dotOpacity={dotOn ? 1 : 0} />
        </div>
      </World>
      {!dotOn && fly > 0 && (
        <div style={{position: 'absolute', left: gx - gd / 2, top: gy - gd / 2, width: gd, height: gd, borderRadius: '50%', background: interpolateColors(fly, [0, 1], [C.teal, '#DE8957']), display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px -8px rgba(25,43,42,0.4)'}}>
          {gd > 40 && <Icon name="check" size={gd * 0.55} color={C.cream} stroke={3.2} />}
        </div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top: lerp(860, 300, chipUp), display: 'flex', justifyContent: 'center', opacity: Math.min(1, chipIn * 2), transform: `scale(${lerp(1.3, 0.62, chipUp) * (0.8 + 0.2 * chipIn)})`}}>
        <div style={{padding: '18px 34px', borderRadius: 28, background: C.charcoal, boxShadow: '0 20px 40px -18px rgba(25,43,42,0.6)'}}>
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 60, letterSpacing: '0.01em', color: C.cream, textAlign: 'center', lineHeight: 1.1}}>
            ORGANIC RANKINGS
            <br />
            <span style={{color: C.amber}}>AREN’T FOR SALE.</span>
          </div>
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 985, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, letterSpacing: '-0.02em', color: C.charcoal, opacity: Math.min(1, l1 * 2), transform: `translateY(${(1 - l1) * 40}px) scale(${0.9 + 0.1 * l1})`}}>Get Found.</div>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, letterSpacing: '-0.02em', color: C.charcoal, opacity: Math.min(1, l2 * 2), transform: `translateY(${(1 - l2) * 40}px) scale(${0.9 + 0.1 * l2})`}}>
          Grow <span style={{color: C.teal, fontStyle: 'italic', fontWeight: 600}}>Smarter.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
