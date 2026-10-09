import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, FONT_DISPLAY, FONT_TEXT} from '../theme';
import {B} from '../beats';
import {E, kf, lerp, prog} from '../lib/anim';
import {DarkEnv} from '../components/Primitives';
import {Icon} from '../components/Icons';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, enter} from '../components/Card3D';
import {KLine} from '../components/Faces';
import {Wordmark3D} from '../components/Wordmark3D';
import {PERSPECTIVE, S6_CENTER, WM7} from '../layout';
import {DOT7, ringAt} from '../ring';

// Scene 7 · bars 19–20 · 28.8–32 s · Brand and invitation
// Hard cut to charcoal on the bar-19 phrase hit. The ring carries the gathered work to
// the wordmark, sweeps it (revealing the extruded mark as it passes) and collapses into
// the warm dot on the strongest hit (bar 19 beat 3 = 29.6 s). The invitation and URL
// follow on 16ths; the music resolves on bar 20 beat 3 with the CTA held to the end.

const REVEAL = B(19, 3); // 888
const RESOLVE = B(20, 3); // 936
const WM_RIGHT = 925; // right edge of the wordmark incl. dot at size 128

export const S7Reveal: React.FC<{frame: number}> = ({frame: f}) => {
  const ring = ringAt(f);
  const sweeping = f >= B(19, 1, 2) && f < REVEAL;
  const clipRight = f < B(19, 1, 2) ? 2000 : sweeping ? Math.max(0, WM_RIGHT - ring.x) : 0;
  const settle = prog(f, B(19, 1, 2), 26, E.out);
  const shock = prog(f, B(19), 14, E.out);
  const hit = kf(f, [REVEAL, REVEAL + 1, REVEAL + 8], [0, 1, 0], E.linear);
  const sweep = prog(f, REVEAL, 18, E.inOutSoft);
  const url = enter(f, B(19, 3, 1), {y: 140, z: -360, rx: 50}, {rx: 2}, 10);
  const resolve = kf(f, [RESOLVE, RESOLVE + 2, RESOLVE + 18], [0, 1, 0], E.soft);

  return (
    <AbsoluteFill>
      <DarkEnv glowX={540} glowY={WM7.cy + 200} glow={1 + hit * 0.5} gridOpacity={0.5} />

      {/* phrase-hit shockwave from the ring */}
      {shock > 0 && shock < 1 && (
        <div style={{position: 'absolute', left: S6_CENTER.x - 120 - shock * 700, top: S6_CENTER.y - 120 - shock * 700, width: 240 + shock * 1400, height: 240 + shock * 1400, borderRadius: '50%', border: `${6 * (1 - shock)}px solid ${C.mint}`, opacity: (1 - shock) * 0.7}} />
      )}

      {/* teal light passing behind the mark after the reveal */}
      {sweep > 0 && sweep < 1 && (
        <div style={{position: 'absolute', left: lerp(-300, 1180, sweep) - 200, top: WM7.cy - 200, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(23,97,90,0.75), rgba(23,97,90,0))', filter: 'blur(10px)'}} />
      )}

      <Stage perspective={PERSPECTIVE}>
        <Wordmark3D
          size={WM7.size}
          cy={WM7.cy}
          dark
          depth={22}
          rx={lerp(30, 0, settle)}
          ry={lerp(-14, 0, settle)}
          s={1 + hit * 0.03}
          ramp={['#2D6D64', '#0F2E2B']}
          clipRight={clipRight}
          dotOpacity={f >= REVEAL ? 1 : 0}
          dotScale={kf(f, [REVEAL, REVEAL + 3, REVEAL + 8], [1, 1.35, 1], E.soft)}
        />

      </Stage>
      <Stage perspective={PERSPECTIVE}>
        {/* URL card */}
        {f >= B(19, 3, 1) && (
          <Obj cx={540} cy={1196} w={720} h={136} pose={url}>
            <Card3D w={720} h={136} depth={18} radius={68} face={C.mint} edge={EDGE.mint} ry={url.ry} lift={50} glow={`0 0 ${40 + resolve * 50}px ${resolve * 10}px rgba(183,216,197,${0.35 + resolve * 0.3})`}>
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 22px 0 54px'}}>
                <span style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 62, letterSpacing: '-0.03em', color: C.charcoal}}>{COPY.s7.url}</span>
                <div style={{width: 92, height: 92, borderRadius: '50%', background: C.charcoal, display: 'grid', placeItems: 'center'}}>
                  <Icon name="arrow" size={46} color={C.mint} stroke={2.6} />
                </div>
              </div>
            </Card3D>
          </Obj>
        )}
      </Stage>

      {/* Invitation */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 880, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <KLine f={f} at={REVEAL}>
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 80, lineHeight: 1.04, letterSpacing: '-0.035em', color: C.cream, whiteSpace: 'nowrap'}}>{COPY.s7.lines[0]}</div>
        </KLine>
        <KLine f={f} at={REVEAL + 3}>
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 80, lineHeight: 1.04, letterSpacing: '-0.035em', color: C.mint, whiteSpace: 'nowrap'}}>{COPY.s7.lines[1]}</div>
        </KLine>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1316, textAlign: 'center', fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 36, color: C.mintText, opacity: prog(f, B(19, 4), 8, E.soft)}}>{COPY.s7.credit}</div>

      {/* collapse spark exactly where the dot lands */}
      {hit > 0 && <div style={{position: 'absolute', left: DOT7.x - 60, top: DOT7.y - 60, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(222,137,87,0.65), rgba(222,137,87,0))', opacity: hit}} />}
    </AbsoluteFill>
  );
};
