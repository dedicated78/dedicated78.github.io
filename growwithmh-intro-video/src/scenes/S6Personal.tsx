import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, FONT_TEXT} from '../theme';
import {B} from '../beats';
import {E, kf, lerp, mix, prog} from '../lib/anim';
import {CreamEnv} from '../components/Primitives';
import {Icon} from '../components/Icons';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, POSE0, Pose, enter, mixPose} from '../components/Card3D';
import {AnswerMiniFace, H, KLine, MapFace, SiteMiniFace} from '../components/Faces';
import {PERSPECTIVE, S6_CENTER, S6_OBJ} from '../layout';
import {ringAt} from '../ring';

// Scene 6 · bars 16–18 · 24–28.8 s · Personal attention
// Map, website and answer share one composition. "Research": the ring inspects each
// object (bar 16 beat 3). "Priorities": they re-stack by importance with numbered badges
// on the bar-17 downbeat. "Action": check stamps land on bar 17 beat 3, then 8ths.
// The snare roll on bar 18 pulls everything into the ring for the reveal.

const STEP_AT = [B(16, 3), B(17), B(17, 3)];
const COMPRESS = B(18, 4);

type K = 'map' | 'site' | 'answer';
const START: Record<K, Pose> = {
  map: {...POSE0, rx: 10, ry: 16, rz: -4},
  site: {...POSE0, rx: 6, ry: 0, z: -60},
  answer: {...POSE0, rx: 8, ry: -14, rz: 3},
};
const PRIORITY: Record<K, Pose> = {
  site: {...POSE0, y: 70, z: 140, rx: 4, s: 1.06},
  map: {...POSE0, x: 30, y: -60, z: -200, rx: 12, ry: 22, rz: -5},
  answer: {...POSE0, x: -30, y: -50, z: -200, rx: 10, ry: -20, rz: 4},
};
const RANK: Record<K, number> = {site: 1, map: 2, answer: 3};

export const S6Personal: React.FC<{frame: number}> = ({frame: f}) => {
  const pri = prog(f, STEP_AT[1], 10, E.back);
  const comp = prog(f, COMPRESS - 2, 12, E.in);
  const out = prog(f, B(18, 3, 2), 8, E.in);
  const ring = ringAt(f);
  const active = f >= STEP_AT[2] ? 2 : f >= STEP_AT[1] ? 1 : f >= STEP_AT[0] ? 0 : -1;

  const pose = (k: K): Pose => {
    const L = S6_OBJ[k];
    const base = k === 'map' ? enter(f, B(16), {x: -360, y: 80, z: -500, ry: 40, rx: 20}, START.map, 10) : START[k];
    const p = mixPose(base, PRIORITY[k], pri);
    return mixPose(p, {...POSE0, x: S6_CENTER.x - L.cx, y: S6_CENTER.y - L.cy, z: -200, rx: 40, ry: k === 'map' ? 60 : k === 'site' ? 0 : -60, s: 0.05}, comp);
  };

  return (
    <AbsoluteFill>
      <CreamEnv haloY={850} halo={1} lines={0.7} />

      {(['map', 'answer', 'site'] as K[]).map((k) => {
        const L = S6_OBJ[k];
        const p = pose(k);
        const near = Math.hypot(ring.x - L.cx, ring.y - L.cy) < 120 && active === 0 ? 1 : 0;
        const stamp = prog(f, STEP_AT[2] + (RANK[k] - 1) * 6, 8, E.back);
        const badge = prog(f, STEP_AT[1] + (RANK[k] - 1) * 3, 7, E.back);
        return (
          <Stage key={k} perspective={PERSPECTIVE}>
            <Obj cx={L.cx} cy={L.cy} w={L.w} h={L.h} pose={p}>
              <Card3D
                w={L.w}
                h={L.h}
                depth={20}
                radius={26}
                face={k === 'map' ? '#1E3533' : k === 'site' ? C.paper : C.cream}
                edge={k === 'map' ? EDGE.dark : EDGE.paper}
                border={`2.5px solid ${near ? C.teal : k === 'map' ? 'rgba(183,216,197,0.25)' : C.creamLine}`}
                ry={p.ry}
                lift={60 + (k === 'site' ? pri * 60 : 0)}
                gloss={0.5 + near}
                opacity={1 - prog(comp, 0.6, 0.4)}
                glow={stamp > 0 ? `0 0 0 ${4 * stamp}px rgba(23,97,90,0.35)` : undefined}
                layers={[
                  {
                    key: 'badge',
                    z: 34,
                    opacity: badge,
                    node: (
                      <div
                        style={{
                          position: 'absolute',
                          left: -20,
                          top: -20,
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: RANK[k] === 1 ? C.teal : C.charcoal,
                          color: C.cream,
                          display: 'grid',
                          placeItems: 'center',
                          fontFamily: FONT_TEXT,
                          fontWeight: 700,
                          fontSize: 32,
                          transform: `scale(${badge})`,
                          boxShadow: '6px 12px 20px -8px rgba(0,0,0,0.4)',
                        }}
                      >
                        {RANK[k]}
                      </div>
                    ),
                  },
                  {
                    key: 'stamp',
                    z: 40 + (1 - stamp) * 160,
                    opacity: Math.min(1, stamp * 2),
                    node: (
                      <div
                        style={{
                          position: 'absolute',
                          right: -22,
                          top: -22,
                          width: 76,
                          height: 76,
                          borderRadius: '50%',
                          background: C.accent,
                          display: 'grid',
                          placeItems: 'center',
                          transform: `scale(${lerp(1.7, 1, stamp)})`,
                          boxShadow: '0 10px 22px -6px rgba(222,137,87,0.55)',
                        }}
                      >
                        <Icon name="check" size={42} color={C.cream} stroke={3.2} />
                      </div>
                    ),
                  },
                ]}
              >
                {k === 'map' && <MapFace w={L.w} h={L.h} />}
                {k === 'site' && <SiteMiniFace improved={1} />}
                {k === 'answer' && <AnswerMiniFace />}
              </Card3D>
            </Obj>
          </Stage>
        );
      })}

      {/* Research → Priorities → Action */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 262,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          opacity: 1 - out,
          transform: `translateY(${out * -40}px)`,
        }}
      >
        {COPY.s6.steps.map((s, i) => {
          const p = prog(f, B(16) + 4 + i * 2, 7, E.back);
          const on = active === i ? 1 : 0;
          const done = active > i ? 1 : 0;
          const lit = prog(f, STEP_AT[i], 5, E.out);
          return (
            <React.Fragment key={s}>
              {i > 0 && (
                <div style={{opacity: p}}>
                  <Icon name="arrow" size={40} color={mix(lit, 'rgba(25,43,42,0.3)', C.teal)} stroke={2.6} />
                </div>
              )}
              <div
                style={{
                  fontFamily: FONT_TEXT,
                  fontWeight: 700,
                  fontSize: 44,
                  letterSpacing: '-0.02em',
                  padding: '14px 26px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  color: on ? C.cream : done ? C.teal : C.muted,
                  background: on ? C.teal : done ? 'rgba(183,216,197,0.55)' : 'transparent',
                  border: `2.5px solid ${on || done ? C.teal : 'rgba(25,43,42,0.18)'}`,
                  transform: `scale(${(0.8 + 0.2 * p) * (1 + 0.06 * kf(f, [STEP_AT[i], STEP_AT[i] + 3, STEP_AT[i] + 8], [0, 1, 0]))})`,
                  opacity: Math.min(1, p * 2),
                }}
              >
                {s}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Headline (bottom) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1196, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <KLine f={f} at={B(16) + 3} out={B(18, 3, 2)}>
          <H size={108} color={C.charcoal}>
            {COPY.s6.headline[0]}
          </H>
        </KLine>
        <KLine f={f} at={B(16) + 6} out={B(18, 3, 3)}>
          <H size={108} color={C.teal}>
            {COPY.s6.headline[1]}
          </H>
        </KLine>
      </div>
    </AbsoluteFill>
  );
};
