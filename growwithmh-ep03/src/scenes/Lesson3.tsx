import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {C, FONT_DISPLAY} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Obj} from '../components/Card3D';
import {Icon} from '../components/Icons';
import {Wordmark3D} from '../components/Text';
import {LogoTile} from '../props/Ep02Props';
import {CheckChip, FactorFace, LOCALMAP, LocalSearchMap, ServeCard, StatementCard} from '../props/Ep03Props';
import {Studio, World} from './common';

// =============================================================== SEQUENCE E · THE LESSON (narrator)
export const Lesson3: React.FC<{t: number}> = ({t}) => {
  const enter = pr(t, Q.L09e + 0.5, 0.6, EZ.out); // continues the push into the list card
  const stIn = pr(t, Q.adding - 0.15, 0.55, EZ.back);
  const stOut = pr(t, Q.relevance - 0.5, 0.45, EZ.in); // holds through "Local visibility mainly depends on"
  const factorsOut = pr(t, Q.L12 - 0.4, 0.45, EZ.in);
  const mapIn = pr(t, Q.L12 - 0.25, 0.6, EZ.back);
  const exit = pr(t, Q.L13e + 0.05, 0.5, EZ.in);
  const cam = {
    x: 540,
    y: 900,
    s: lerp(1.25, 1, enter) + 0.03 * pr(t, Q.L11, 4, EZ.linear) + exit * 0.5,
    rx: lerp(5, 0, pr(t, Q.L11 - 0.2, 1.4, EZ.inOut)),
    rz: lerp(-1, 1, pr(t, Q.L12, 4.5, EZ.inOut)),
  };
  const factorAt = [Q.relevance, Q.distance, Q.prominence];
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.L09e + 0.55, 0.25) * (1 - pr(t, Q.L13e + 0.3, 0.3))}}>
      <Studio haloY={800} floorY={1500} />
      <World cam={cam} perspective={1700}>
        {stIn > 0 && stOut < 1 && (
          <Obj cx={540} cy={800} w={900} h={420} pose={{z: lerp(-500, 0, stIn) - stOut * 900, rx: lerp(35, 3, stIn) + stOut * 25, ry: Math.sin(t * 0.6) * 3, y: -stOut * 200, s: 0.98}}>
            <StatementCard neq={pr(t, Q.automatically - 0.1, 0.45, EZ.back)} />
          </Obj>
        )}
        {[0, 1, 2].map((i) => {
          const p = pr(t, factorAt[i] - 0.05, 0.42, EZ.back);
          if (p <= 0 || factorsOut >= 1) return null;
          const cy = 560 + i * 300;
          return (
            <Obj key={i} cx={540} cy={lerp(860, cy, p)} w={860} h={260} pose={{z: lerp(-500, 0, p) - factorsOut * 300, rx: lerp(50, 3, p), ry: lerp(i === 1 ? 0 : i ? 18 : -18, 0, p), x: factorsOut * (i % 2 ? 900 : -900), s: lerp(0.6, 1, p)}}>
              <FactorFace i={i} p={pr(t, factorAt[i] + 0.15, 0.5)} />
            </Obj>
          );
        })}
        {mapIn > 0 && (
          <Obj cx={540} cy={760} w={LOCALMAP.w} h={LOCALMAP.h} pose={{z: lerp(-500, 0, mapIn), rx: lerp(35, 4, mapIn) + Math.sin(t * 0.5) * 2, ry: Math.sin(t * 0.4) * 3, s: 0.98}}>
            <LocalSearchMap a={pr(t, Q.L12 + 0.2, 0.45, EZ.out)} b={pr(t, Q.L12 + 0.55, 0.6, EZ.out)} area={pr(t, Q.choose + 0.15, 0.6, EZ.back)} />
          </Obj>
        )}
        {pr(t, Q.serve - 0.2, 0.45, EZ.back) > 0 && (
          <Obj cx={540} cy={1185} w={860} h={150} pose={{z: lerp(-400, 0, pr(t, Q.serve - 0.2, 0.45, EZ.back)), rx: lerp(40, 4, pr(t, Q.serve - 0.2, 0.45, EZ.back)), s: 0.98}}>
            <ServeCard />
          </Obj>
        )}
      </World>
      {/* L13 · the two habits, above the map */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 268, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14}}>
        <CheckChip label="Accurate business info" p={pr(t, Q.accurate - 0.05, 0.4, EZ.back)} />
        <CheckChip label="Stronger local presence" p={pr(t, Q.stronger - 0.05, 0.4, EZ.back)} />
      </div>
      {/* bright push-through back to the set */}
      <AbsoluteFill style={{background: C.paper, opacity: pr(t, Q.L13e + 0.2, 0.15)}} />
    </AbsoluteFill>
  );
};

// =============================================================== SEQUENCE G · BRANDED OUTRO (Episode 02 end card)
const LOGO = {size: 290, cy: 560};
const WM = {size: 104, cy: 845};
const DOT = {x: 540 + 345, y: WM.cy + 26};

export const Outro3: React.FC<{t: number}> = ({t}) => {
  const fly = pr(t, Q.outro + 0.05, 0.5, EZ.inOut);
  const logoIn = pr(t, Q.grow - 0.15, 0.6, EZ.back);
  const reveal = pr(t, Q.grow + 0.05, 0.55, EZ.inOut);
  const settle = pr(t, Q.grow, 0.8, EZ.out);
  const gx = lerp(560, DOT.x, fly);
  const gy = lerp(1150, DOT.y, fly);
  const gd = lerp(84, WM.size * 0.2, pr(t, Q.outro + 0.35, 0.35, EZ.inOut));
  const dotOn = t >= Q.outro + 0.6;
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
      <div style={{position: 'absolute', left: 0, right: 0, top: 985, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, letterSpacing: '-0.02em', color: C.charcoal, opacity: Math.min(1, l1 * 2), transform: `translateY(${(1 - l1) * 40}px) scale(${0.9 + 0.1 * l1})`}}>Get Found.</div>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, letterSpacing: '-0.02em', color: C.charcoal, opacity: Math.min(1, l2 * 2), transform: `translateY(${(1 - l2) * 40}px) scale(${0.9 + 0.1 * l2})`}}>
          Grow <span style={{color: C.teal, fontStyle: 'italic', fontWeight: 600}}>Smarter.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
