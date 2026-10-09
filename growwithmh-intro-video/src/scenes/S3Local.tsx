import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, FONT_TEXT} from '../theme';
import {B} from '../beats';
import {E, kf, mix, prog} from '../lib/anim';
import {DarkEnv} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, POSE0, Pose, enter, mixPose} from '../components/Card3D';
import {H, KLine, MapFace} from '../components/Faces';
import {CARD3, MAP3, PERSPECTIVE, PIN3, S2_OBJ, card3Row} from '../layout';
import {MAP_HANDOFF} from './S2Brand';

// Scene 3 · bars 5–8 · 6.4–12.8 s · Local discovery
// The map object fills the frame and unfolds into a ground plane on the bar-5 downbeat.
// The business profile rises from behind it; its details snap into order on 8ths. The
// ring selects Services (snare) and the link to the location draws; the ring hovers the
// location, contact options pop on bar 8, and the Website click hands over to Scene 4.

export const CARD3_REST: Pose = {...POSE0, rx: 4, ry: -3};
export const ROTATE_START = B(8, 4); // 372

const ORGANISE = [B(5, 3), B(5, 3, 2), B(5, 4), B(5, 4, 2)];
const SELECT = B(6, 2);

/** Map plane pose: S2 tile → fills frame (dive) → unfolds to the ground (bar 5) → tips away. */
const mapPose = (f: number): Pose => {
  const L = S2_OBJ.map;
  const tile: Pose = {x: L.cx - 540, y: L.cy - 960, z: 0, rx: 12, ry: 18, rz: -4, s: L.w / MAP3.size};
  const fill: Pose = {...POSE0, s: 1.45};
  const ground: Pose = {...POSE0, y: MAP3.cy - 960, z: MAP3.z, rx: MAP3.rx, s: 1};
  const away: Pose = {...ground, y: ground.y + 320, rx: 80};
  const a = prog(f, MAP_HANDOFF, B(5) - 2 - MAP_HANDOFF, E.inOut);
  const b = prog(f, B(5) - 2, 16, E.out);
  const c = prog(f, ROTATE_START, 16, E.in);
  return mixPose(mixPose(mixPose(tile, fill, a), ground, b), away, c);
};

export const S3Local: React.FC<{frame: number}> = ({frame: f}) => {
  const env = prog(f, B(4, 4, 2), 6, E.soft);
  const mp = mapPose(f);
  const exit = prog(f, ROTATE_START, 14, E.in);
  const pinDrop = prog(f, B(5, 2), 8, E.in);
  const pinSquash = kf(f, [B(5, 2) + 8, B(5, 2) + 10, B(5, 2) + 15], [1, 0.86, 1], E.soft);
  const radius = prog(f, B(7, 3), 14, E.out);
  const link = prog(f, SELECT, 12, E.inOut);

  const cardPose = enter(f, B(5, 2), {y: 420, z: -900, rx: 56, ry: 6}, CARD3_REST, 12);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: env}}>
        <DarkEnv glowX={540} glowY={1150} glow={1} gridOpacity={0.6} />
      </AbsoluteFill>

      {/* Map plane (own 3D context) */}
      <Stage perspective={PERSPECTIVE}>
        <Obj cx={540} cy={960} w={MAP3.size} h={MAP3.size} pose={mp}>
          <Card3D
            w={MAP3.size}
            h={MAP3.size}
            depth={90}
            step={9}
            radius={130}
            face="#1E3533"
            edge={EDGE.dark}
            border="6px solid rgba(183,216,197,0.25)"
            ry={mp.ry}
            gloss={0.3}
            shadow={1 - prog(f, MAP_HANDOFF, 10)}
            lift={300}
            opacity={1 - exit}
          >
            <MapFace w={MAP3.size} h={MAP3.size} pin={0} draw={1} radius={radius} />
          </Card3D>
          {/* upright location pin, counter-rotated to stand on the tilted map */}
          {f >= B(5, 2) && (
            <div
              style={{
                position: 'absolute',
                left: MAP3.size / 2 - 60,
                top: MAP3.size / 2 - 150,
                width: 120,
                height: 150,
                transformOrigin: '50% 100%',
                transform: `translateZ(2px) rotateX(${-mp.rx}deg) translateY(${(1 - pinDrop) * -260}px) scaleY(${pinSquash})`,
                opacity: 1 - exit,
              }}
            >
              <svg width={120} height={150} viewBox="0 0 120 150" style={{overflow: 'visible', filter: 'drop-shadow(0 0 22px rgba(183,216,197,0.55))'}}>
                <path d="M60 148S12 103 12 66a48 48 0 0 1 96 0c0 37-48 82-48 82Z" fill={C.teal} stroke={C.mint} strokeWidth={6} />
                <circle cx={60} cy={66} r={18} fill={C.cream} />
              </svg>
            </div>
          )}
        </Obj>
      </Stage>

      {/* Pulse rings on the location (screen space over the projected pin tip) */}
      {[SELECT + 10, B(7, 3)].map((at) => {
        const p = prog(f, at, 16, E.out);
        if (p <= 0 || p >= 1) return null;
        return (
          <div
            key={at}
            style={{
              position: 'absolute',
              left: PIN3.x - 60 - p * 220,
              top: PIN3.y - 22 - p * 70,
              width: 120 + p * 440,
              height: 44 + p * 140,
              borderRadius: '50%',
              border: `4px solid ${C.mint}`,
              opacity: (1 - p) * (1 - exit),
            }}
          />
        );
      })}

      {/* Link: selected service ↔ the business location */}
      {link > 0 && (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - exit, overflow: 'visible'}}>
          <path
            d={`M ${card3Row(0).x - 30} ${card3Row(0).y + 10} C 40 ${card3Row(0).y + 330}, 220 ${PIN3.y - 40}, ${PIN3.x - 50} ${PIN3.y - 70}`}
            fill="none"
            stroke={C.mint}
            strokeWidth={5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${link} 1`}
            style={{filter: 'drop-shadow(0 0 8px rgba(183,216,197,0.7))'}}
          />
        </svg>
      )}

      {/* Business profile card (Scene 4 takes it over for the rotation) */}
      {f < ROTATE_START && f >= B(5, 2) && (
        <Stage perspective={PERSPECTIVE}>
          <Obj cx={CARD3.cx} cy={CARD3.cy} w={CARD3.w} h={CARD3.h} pose={cardPose}>
            <ProfileCard f={f} pose={cardPose} />
          </Obj>
        </Stage>
      )}

      {/* Headline (left aligned) */}
      <div style={{position: 'absolute', left: 90, top: 250}}>
        <KLine f={f} at={B(5) + 6} out={ROTATE_START}>
          <H size={104} color={C.cream}>
            {COPY.s3.headline[0]}
          </H>
        </KLine>
        <KLine f={f} at={B(5) + 9} out={ROTATE_START + 2}>
          <H size={104} color={C.mint}>
            {COPY.s3.headline[1]}
          </H>
        </KLine>
      </div>

      {/* Service label */}
      <ServiceLabel f={f} exit={exit} />
    </AbsoluteFill>
  );
};

const ServiceLabel: React.FC<{f: number; exit: number}> = ({f, exit}) => {
  const p = prog(f, B(6), 8, E.back);
  if (p <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1408, display: 'flex', justifyContent: 'center', opacity: Math.min(1, p * 2) * (1 - exit)}}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 40}px) scale(${0.85 + 0.15 * p})`,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 28px 14px 18px',
          borderRadius: 999,
          background: 'rgba(25,43,42,0.92)',
          border: `2px solid ${C.mint}`,
          boxShadow: '0 16px 40px -12px rgba(0,0,0,0.6), 0 0 40px -10px rgba(183,216,197,0.5)',
          fontFamily: FONT_TEXT,
          fontWeight: 600,
          fontSize: 44,
          letterSpacing: '-0.01em',
          color: C.cream,
          whiteSpace: 'nowrap',
        }}
      >
        <div style={{width: 56, height: 56, borderRadius: '50%', background: C.mint, display: 'grid', placeItems: 'center'}}>
          <Icon name="pin" size={34} color={C.charcoal} stroke={2.2} />
        </div>
        {COPY.s3.label}
      </div>
    </div>
  );
};

/** The business profile card. `done` renders the finished state (used by Scene 4's rotation). */
export const ProfileCard: React.FC<{f: number; pose: Pose; done?: boolean; opacity?: number}> = ({f, pose, done = false, opacity = 1}) => {
  const org = (i: number) => (done ? 1 : prog(f, ORGANISE[i], 6, E.back));
  const sel = done ? 1 : prog(f, SELECT, 6, E.out);
  const act = (i: number) => (done ? 1 : prog(f, B(8) + i * 4, 7, E.back));
  const webPress = done ? 0 : kf(f, [ROTATE_START - 2, ROTATE_START, ROTATE_START + 5], [0, 1, 0], E.soft);
  const jumble = [
    [46, 14, 3],
    [-34, -8, -4],
    [58, 10, 2.5],
    [-48, 6, -3],
  ];
  return (
    <Card3D
      w={CARD3.w}
      h={CARD3.h}
      depth={24}
      radius={40}
      face={C.cream}
      edge={EDGE.cream}
      ry={pose.ry}
      lift={70}
      shadowColor="0,0,0"
      opacity={opacity}
      glow="0 0 90px -20px rgba(23,97,90,0.8)"
      layers={[
        {
          key: 'head',
          z: 30,
          node: (
            <div style={{position: 'absolute', left: 40, top: 38, display: 'flex', alignItems: 'center', gap: 24}}>
              <div style={{width: 96, height: 96, borderRadius: 26, background: C.teal, display: 'grid', placeItems: 'center', boxShadow: '8px 14px 24px -10px rgba(0,0,0,0.4)'}}>
                <Icon name="tools" size={52} color={C.cream} stroke={2} />
              </div>
              <div>
                <H size={50} color={C.charcoal}>
                  {COPY.s3.business}
                </H>
                <div style={{fontFamily: FONT_TEXT, fontWeight: 500, fontSize: 28, color: C.muted, marginTop: 6}}>{COPY.s3.category}</div>
              </div>
            </div>
          ),
        },
        {
          key: 'actions',
          z: 20,
          node: (
            <div style={{position: 'absolute', left: 38, right: 38, bottom: 34, display: 'flex', gap: 14}}>
              {COPY.s3.actions.map((a, i) => {
                const p = act(i);
                const web = i === 2;
                return (
                  <div
                    key={a}
                    style={{
                      flex: 1,
                      height: 58,
                      borderRadius: 29,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      background: i === 0 ? C.teal : web ? mix(webPress + (done ? 0 : prog(f, ROTATE_START - 8, 6)), C.cream, 'rgba(183,216,197,0.7)') : C.cream,
                      border: i === 0 ? 'none' : `2px solid ${web ? C.teal : C.creamLine}`,
                      fontFamily: FONT_TEXT,
                      fontWeight: 600,
                      fontSize: 27,
                      color: i === 0 ? C.cream : C.charcoal,
                      opacity: Math.min(1, p * 2),
                      transform: `scale(${(0.6 + 0.4 * p) * (1 - webPress * 0.06 * (web ? 1 : 0))})`,
                    }}
                  >
                    <Icon name={(['phone', 'directions', 'globe'] as IconName[])[i]} size={28} color={i === 0 ? C.cream : C.teal} />
                    {a}
                  </div>
                );
              })}
            </div>
          ),
        },
      ]}
    >
      <div style={{position: 'absolute', left: 40, right: 40, top: 160, height: 2, background: C.creamLine}} />
      {COPY.s3.rows.map((r, i) => {
        const p = org(i);
        const [dx, dy, rot] = jumble[i];
        const selected = i === 0 ? sel : 0;
        return (
          <div
            key={r.label}
            style={{
              position: 'absolute',
              left: 24,
              right: 24,
              top: 176 + i * 64,
              height: 54,
              borderRadius: 16,
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              background: `rgba(23,97,90,${0.14 * selected})`,
              border: `2px solid rgba(23,97,90,${0.6 * selected})`,
              transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px) rotate(${(1 - p) * rot}deg)`,
              opacity: 0.45 + 0.55 * p,
            }}
          >
            <Icon name={r.icon as IconName} size={34} color={mix(p, C.muted, C.teal)} />
            <div style={{fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 32, color: mix(p, C.muted, C.charcoal), width: 230, whiteSpace: 'nowrap'}}>{r.label}</div>
            <div style={{flex: 1, display: 'flex', gap: 10, justifyContent: 'flex-end'}}>
              {i === 0 ? (
                [80, 110, 90].map((w, k) => <div key={k} style={{width: w * (0.5 + 0.5 * p), height: 26, borderRadius: 13, background: mix(selected, 'rgba(23,97,90,0.18)', C.teal), opacity: 0.4 + 0.6 * p}} />)
              ) : (
                <div style={{width: 260 * (0.3 + 0.7 * p), height: 18, borderRadius: 9, background: mix(p, 'rgba(25,43,42,0.12)', C.mint)}} />
              )}
            </div>
          </div>
        );
      })}
    </Card3D>
  );
};
