import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C} from '../theme';
import {B} from '../beats';
import {E, caretOn, kf, lerp, prog, typed} from '../lib/anim';
import {DarkEnv} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, enter, mixPose} from '../components/Card3D';
import {H, IconLabel, KLine} from '../components/Faces';
import {PERSPECTIVE, S1_FRAGS, S1_PUSH, S1_SEARCH} from '../layout';
import {ringAt} from '../ring';

// Scene 1 · bars 1–2 · 0–3.2 s · The problem
// Frame 0: "Great service." with the business card already landing on the first kick.
// Bar 2 downbeat: the line cuts to "Hard to find?", the card falls back among scattered
// business details and a search card arrives. The ring searches, then rushes the camera.

const SWAP = B(2); // 48
const TYPE = {start: B(2, 1, 3), fpc: 1.35};

export const S1Problem: React.FC<{frame: number}> = ({frame: f}) => {
  const rush = prog(f, B(2, 4, 1), 10, E.in); // 87 → 97: everything drops back as the ring flies at camera
  const push = prog(f, B(2, 1, 2), 26, E.inOut);
  const camS = 1 + (S1_PUSH - 1) * push;

  // Business card: lands on the first kick, falls back into the clutter on bar 2.
  const bizIn = enter(f, -2, {x: 150, y: 260, z: -650, rx: 26, ry: -24, rz: 4}, {rx: 4, ry: -6, rz: 0}, 11);
  const fall = prog(f, SWAP - 4, 12, E.inOut);
  const biz = mixPose(bizIn, {x: -300, y: -320, z: -1150, rx: 32, ry: 34, rz: -12, s: 1}, fall);
  const checks = [B(1, 3), B(1, 3, 1), B(1, 3, 2)].map((t) => prog(f, t, 6, E.back));

  // Search card arrives on the bar-2 downbeat.
  const sIn = enter(f, SWAP, {x: -280, y: 200, z: -520, rx: 20, ry: 26, rz: -3}, {rx: 3, ry: -2}, 10);
  const sPose = {...sIn, z: sIn.z - rush * 600, rx: sIn.rx + rush * 20};
  const text = typed(COPY.s1.query, f, TYPE.start, TYPE.fpc);
  const typing = f >= TYPE.start && f < TYPE.start + COPY.s1.query.length * TYPE.fpc + 2;
  const ring = ringAt(f);

  return (
    <AbsoluteFill>
      <DarkEnv glowX={lerp(300, 700, prog(f, 0, 90, E.linear))} glowY={980} glow={1} gridShiftY={-f * 0.8} />

      <Stage cam={{x: 540, y: 960, s: camS}} perspective={PERSPECTIVE}>
        {/* Scattered business details: present, but disconnected */}
        {COPY.s1.fragments.map((fr, i) => {
          const L = S1_FRAGS[i];
          const p = enter(f, SWAP + 1 + i * 2, {z: -900, rx: 30, ry: i % 2 ? -40 : 40, s: 0.7}, {z: L.z, rx: L.rx, ry: L.ry, rz: L.rz}, 10);
          const drift = Math.sin((f + i * 17) / 14) * 6;
          const near = Math.hypot(ring.x - L.cx, ring.y - L.cy) < 170 && f > B(2, 3) ? 1 : 0;
          const o = (f >= SWAP + 1 + i * 2 ? 0.8 : 0) * (1 - rush);
          return (
            <Obj key={fr.label} cx={L.cx} cy={L.cy} w={350} h={110} pose={{...p, y: p.y + drift, z: p.z - rush * 500}}>
              <Card3D
                w={350}
                h={110}
                depth={14}
                radius={24}
                face="linear-gradient(160deg, rgba(43,76,71,0.98), rgba(30,52,49,0.98))"
                edge={EDGE.dark}
                border={`1.5px solid ${near ? C.mint : 'rgba(183,216,197,0.22)'}`}
                opacity={o}
                ry={p.ry}
                lift={30}
                shadow={0.6}
              >
                <IconLabel icon={fr.icon as IconName} label={fr.label} size={36} />
              </Card3D>
            </Obj>
          );
        })}

        {/* Business card */}
        <Obj cx={540} cy={1010} w={700} h={430} pose={biz}>
          <Card3D
            w={700}
            h={430}
            depth={22}
            radius={34}
            face={C.cream}
            edge={EDGE.cream}
            opacity={(1 - fall * 0.55) * (1 - rush)}
            ry={biz.ry}
            lift={lerp(60, 20, fall)}
            shadowColor="0,0,0"
            layers={[
              {
                key: 'icon',
                z: 36,
                node: (
                  <div style={{position: 'absolute', left: 44, top: 44, width: 112, height: 112, borderRadius: 30, background: C.teal, display: 'grid', placeItems: 'center', boxShadow: '8px 14px 24px -10px rgba(0,0,0,0.45)'}}>
                    <Icon name="tools" size={60} color={C.cream} stroke={2} />
                  </div>
                ),
              },
              {
                key: 'title',
                z: 18,
                node: (
                  <div style={{position: 'absolute', left: 190, top: 56}}>
                    <H size={58} color={C.charcoal}>
                      {COPY.s1.business}
                    </H>
                    <div style={{width: 210, height: 14, borderRadius: 7, background: 'rgba(25,43,42,0.15)', marginTop: 18}} />
                  </div>
                ),
              },
            ]}
          >
            {[0, 1, 2].map((i) => (
              <div key={i} style={{position: 'absolute', left: 48, top: 206 + i * 66, display: 'flex', alignItems: 'center', gap: 20}}>
                <div style={{width: 44, height: 44, borderRadius: '50%', background: checks[i] > 0.5 ? C.teal : 'rgba(23,97,90,0.12)', display: 'grid', placeItems: 'center', transform: `scale(${0.7 + 0.3 * checks[i]})`}}>
                  <div style={{opacity: checks[i]}}>
                    <Icon name="check" size={28} color={C.cream} stroke={3} />
                  </div>
                </div>
                <div style={{width: [360, 300, 330][i], height: 16, borderRadius: 8, background: 'rgba(25,43,42,0.16)'}} />
              </div>
            ))}
          </Card3D>
        </Obj>

        {/* Search card */}
        {f >= SWAP && (
          <Obj cx={S1_SEARCH.cx} cy={S1_SEARCH.cy} w={S1_SEARCH.w} h={S1_SEARCH.h} pose={sPose}>
            <Card3D w={S1_SEARCH.w} h={S1_SEARCH.h} depth={20} radius={44} face={C.cream} edge={EDGE.cream} opacity={1 - rush} ry={sPose.ry} lift={50} shadowColor="0,0,0" glow="0 0 70px -10px rgba(23,97,90,0.7)">
              <div style={{position: 'absolute', left: 150, right: 130, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontFamily: '"GW Text", Inter, sans-serif', fontWeight: 500, fontSize: 48, color: C.charcoal, whiteSpace: 'nowrap'}}>
                {text}
                {(typing || caretOn(f)) && <span style={{width: 4, height: 54, marginLeft: 4, borderRadius: 2, background: C.teal, display: 'inline-block'}} />}
              </div>
              <div style={{position: 'absolute', right: 26, top: 26, width: 98, height: 98, borderRadius: 30, background: C.teal, display: 'grid', placeItems: 'center'}}>
                <Icon name="arrow" size={46} color={C.cream} stroke={2.4} />
              </div>
            </Card3D>
          </Obj>
        )}
      </Stage>

      {/* Headline: on screen from frame 0; cuts to the question on the bar-2 downbeat */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 270, height: 150, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'absolute', top: 0}}>
          <KLine f={f} at={-7} out={SWAP - 3}>
            <H size={124} color={C.cream}>
              {COPY.s1.a[0]} <span style={{color: C.mint}}>{COPY.s1.a[1]}</span>
            </H>
          </KLine>
        </div>
        <div style={{position: 'absolute', top: 0}}>
          <KLine f={f} at={SWAP} out={B(2, 4, 2)}>
            <H size={124} color={C.cream}>
              {COPY.s1.b[0]} <span style={{color: C.mint}}>{COPY.s1.b[1]}</span>
            </H>
          </KLine>
        </div>
      </div>
      {/* Subtle flash on the cut */}
      <AbsoluteFill style={{background: C.mint, opacity: kf(f, [SWAP, SWAP + 1, SWAP + 5], [0, 0.12, 0], E.linear), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
