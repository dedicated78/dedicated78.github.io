import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT_DISPLAY} from '../theme';
import {EZ, Q, keyed, lerp, pr, voice} from '../timing';
import {Owner, OWNER_REST, OwnerPose, GroundShadow} from '../chars/Owner';
import {Obj, enter} from '../components/Card3D';
import {Calendar3D, Coins, Confetti, Phone, ProfileCard, PROFILE} from '../props/Props';
import {Hl, Kicker} from '../components/Text';
import {Studio, World} from './common';

/** Places the owner with his feet at (x, y). */
export const OwnerAt: React.FC<{x: number; y: number; w: number; pose: OwnerPose; shadow?: boolean}> = ({x, y, w, pose, shadow = true}) => (
  <>
    {shadow && <GroundShadow x={x} y={y + 4} w={w * 0.62} lift={-pose.bob * (w / 400)} />}
    <div style={{position: 'absolute', left: x - w / 2, top: y - (700 / 400) * w}}>
      <Owner pose={pose} width={w} />
    </div>
  </>
);
const talk = (t: number, k = 1.5) => Math.min(1, voice(t) * k);

// =============================================================== SCENE 01 · THE CELEBRATION (0 → 4.56 s)
export const S1Celebration: React.FC<{t: number}> = ({t}) => {
  const whip = pr(t, Q.daysLater - 0.16, 0.32, EZ.in);
  const cam = {x: 540, y: 930, s: lerp(0.88, 1, pr(t, -0.1, 0.55)) + 0.06 * pr(t, 0.6, 3.6, EZ.inOut), ty: -whip * 1500};
  const card = enter(Math.round(t * 30), -5, {y: 120, z: -520, rx: 32, ry: -26, rz: 4}, {rx: 4, ry: -4 + 3 * Math.sin(t * 1.4)}, 14);
  const pose = keyed(t, {...OWNER_REST, smile: 1}, [
    {t: -1, d: 0.01, bob: -90, aLs: 155, aLe: 15, aRs: 155, aRe: 15, eyes: 1.32, squash: 1.06},
    {t: 0.26, d: 0.18, e: EZ.in, bob: 0, squash: 0.9},
    {t: 0.44, d: 0.16, squash: 1},
    {t: 0.5, d: 0.32, aRs: 128, aRe: 4, aLs: 36, aLe: 118, eyes: 1.15, lookX: 0.45, lookY: -0.7, head: -6},
    {t: Q.rich - 1.2, d: 0.32, aLs: 24, aLe: 130, aRs: 24, aRe: 130, lean: -4, head: 6, lookX: 0, lookY: 0, smile: 0.95},
    {t: Q.rich - 1.0, d: 0.3, e: EZ.back, shades: 1},
    {t: Q.rich, d: 0.22, e: EZ.back, aRs: 80, aRe: 26, bob: -24},
    {t: Q.rich + 0.3, d: 0.2, bob: 0},
  ]);
  pose.mouth = talk(t);
  if (t > 0.5 && t < 2.4) pose.bob -= voice(t) * 16;
  const coin = (d: number) => pr(t, Q.rich + d, 0.3, EZ.back);
  return (
    <AbsoluteFill style={{opacity: 1 - pr(t, Q.daysLater + 0.05, 0.12)}}>
      <Studio haloY={700} floorY={1260} />
      <World cam={cam}>
        <Obj cx={540} cy={600} w={PROFILE.w} h={PROFILE.h} pose={card}>
          <ProfileCard t={t} verifiedAt={Q.yes + 0.16} ry={card.ry} />
        </Obj>
        <Confetti t={t} at={Q.yes + 0.3} x={830} y={470} n={80} />
        {[250, 830].map((x, i) => {
          const c = coin(i * 0.1);
          const hgt = 110 * 0.4 + (4 + i) * 110 * 0.12;
          const y = 1290 - c * 60 - pr(t, Q.rich + 0.3, 1, EZ.soft) * 30;
          return c > 0 ? (
            <div key={x} style={{position: 'absolute', left: x - 55, top: y - hgt, width: 110, height: hgt, transform: `scale(${c}) rotate(${(i ? 8 : -8) * c}deg)`, transformOrigin: '50% 100%'}}>
              <Coins n={4 + i} size={110} />
            </div>
          ) : null;
        })}
        <OwnerAt x={540} y={1370} w={340} pose={pose} />
      </World>
      <Kicker t={t} at={Q.yes} out={Q.daysLater - 0.3} lines={[<span key="v"><Hl>VERIFIED</Hl>!</span>]} size={136} top={250} />
    </AbsoluteFill>
  );
};

// =============================================================== SCENE 02 · THREE DAYS LATER (4.56 → 11 s)
const BUZZ = [Q.ring, Q.ring + 0.95];
const buzzing = (t: number) => BUZZ.some((b) => t >= b && t < b + 0.5);

export const S2ThreeDaysLater: React.FC<{t: number}> = ({t}) => {
  const enterS = pr(t, Q.daysLater - 0.16, 0.36, EZ.out);
  const toWall = pr(t, Q.daysLater + 0.82, 0.55, EZ.inOut);
  const shopIn = pr(t, Q.daysLater + 0.78, 0.6, EZ.out);
  const page = lerp(0, 1, pr(t, Q.daysLater + 0.12, 0.16, EZ.inOut)) + pr(t, Q.daysLater + 0.36, 0.16, EZ.inOut) + pr(t, Q.daysLater + 0.6, 0.16, EZ.inOut);
  const whipOut = pr(t, Q.googleShout - 0.14, 0.26, EZ.in);

  // camera: title close-up → pull back to the shop → push into the phone → hold on the face
  const camPull = {x: 540, y: 930, s: lerp(1.12, 1, shopIn)};
  const push = pr(t, Q.customerEnd - 0.05, 0.36, EZ.inOut);
  const settle = pr(t, Q.oh - 0.1, 0.6, EZ.inOut);
  const creep = pr(t, Q.momEnd, Q.googleShout - Q.momEnd, EZ.linear);
  const cam = {
    x: lerp(lerp(camPull.x, 700, push), 640, settle) + whipOut * 900,
    y: lerp(lerp(camPull.y, 790, push), 860, settle),
    s: lerp(lerp(camPull.s, 1.45, push), 1.3, settle) + 0.08 * creep,
    ty: (1 - enterS) * 1500,
  };

  // owner: bored → springs up and dashes to the phone → freezes → deflates → deadpan
  const up = Q.firstCustomer;
  const pose = keyed(t, {...OWNER_REST, smile: -0.15, eyes: 0.42, head: 10, lean: 3, aRs: 18, aRe: 150, aLs: 6, aLe: 20, brow: -0.2}, [
    {t: Q.ring + 0.02, d: 0.12, eyes: 0.9, head: 4, lookX: 0.8},
    {t: Q.ring + 0.5, d: 0.25, eyes: 0.5, head: 10, lookX: 0},
    {t: up - 0.05, d: 0.18, e: EZ.back, bob: -70, eyes: 1.35, smile: 1, brow: 0.6, head: -4, aRs: 150, aRe: 20, aLs: 150, aLe: 20, lookX: 0.6, lean: 0},
    {t: up + 0.35, d: 0.3, bob: 0, aRs: 95, aRe: 40, aLs: 40, aLe: 30, lean: 8},
    {t: Q.customerEnd - 0.2, d: 0.25, aRs: 120, aRe: 120, lean: 2, lookX: 0.5, lookY: -0.3},
    {t: Q.recordStop + 0.12, d: 0.45, smile: -0.55, eyes: 0.72, brow: 0.45, lookX: 0.3, lookY: -0.1},
    {t: Q.momEnd + 0.4, d: 0.5, lookX: -0.15, lookY: 0.1, head: 4, brow: 0.2},
    {t: Q.momEnd + 0.75, d: 0.06, eyes: 0.05},
    {t: Q.momEnd + 0.87, d: 0.08, eyes: 0.72},
    {t: Q.momEnd + 1.2, d: 0.1, brow: 0.7},
    {t: Q.momEnd + 1.32, d: 0.12, brow: 0.2},
  ]);
  pose.mouth = talk(t);
  const ownerX = lerp(400, 620, pr(t, up + 0.2, 0.55, EZ.inOut));
  const grab = pr(t, Q.customerEnd - 0.25, 0.3, EZ.inOut);
  const flip = pr(t, Q.customerEnd + 0.02, 0.28, EZ.inOut);
  const jitter = buzzing(t) ? Math.sin(t * 95) * 5 : 0;
  const ringT = BUZZ.map((b) => (t >= b && t < b + 0.6 ? (t - b) / 0.6 : -1));
  const clockSpin = pr(t, Q.daysLater, 0.85, EZ.inOut) * 3 * 360;
  const sign = Math.sin(t * 2.2) * 4 * (1 - pr(t, Q.recordStop, 0.2));

  return (
    <AbsoluteFill style={{opacity: pr(t, Q.daysLater - 0.16, 0.12)}}>
      <Studio haloY={700} floorY={1400} />
      <World cam={cam}>
        {/* the shop */}
        <div style={{position: 'absolute', inset: 0, opacity: shopIn}}>
          <div style={{position: 'absolute', left: -300, right: -300, top: 330, height: 820, background: 'linear-gradient(180deg, #F4F1EA, #EEE9DE)'}} />
          <div style={{position: 'absolute', left: -300, right: -300, top: 900, height: 250, background: 'repeating-linear-gradient(90deg, #E7E1D3 0 4px, #EFEBE1 4px 64px)'}} />
          {/* window + OPEN sign */}
          <div style={{position: 'absolute', left: 620, top: 470, width: 360, height: 420, borderRadius: 22, background: 'linear-gradient(160deg, rgba(183,216,197,0.85), rgba(183,216,197,0.35))', border: '14px solid #FFFFFF', boxShadow: '0 20px 40px -20px rgba(25,43,42,0.35)'}} />
          <div style={{position: 'absolute', left: 710, top: 560, transformOrigin: '50% -40px', transform: `rotate(${sign}deg)`}}>
            <div style={{position: 'absolute', left: 30, top: -40, width: 2, height: 40, background: C.charcoal}} />
            <div style={{position: 'absolute', left: 150, top: -40, width: 2, height: 40, background: C.charcoal}} />
            <div style={{width: 180, height: 76, borderRadius: 14, background: C.teal, display: 'grid', placeItems: 'center', boxShadow: '0 10px 20px -8px rgba(25,43,42,0.4)'}}>
              <span style={{fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: '0.14em', color: C.cream}}>OPEN</span>
            </div>
          </div>
          {/* clock: three days spin past */}
          <div style={{position: 'absolute', left: 430, top: 430, width: 150, height: 150, borderRadius: '50%', background: C.paper, border: `8px solid ${C.charcoal}`, boxShadow: '0 12px 24px -10px rgba(25,43,42,0.35)'}}>
            <div style={{position: 'absolute', left: 63, top: 20, width: 8, height: 55, borderRadius: 4, background: C.charcoal, transformOrigin: '50% 100%', transform: `rotate(${clockSpin}deg)`}} />
            <div style={{position: 'absolute', left: 64, top: 34, width: 6, height: 41, borderRadius: 3, background: C.amber, transformOrigin: '50% 100%', transform: `rotate(${clockSpin / 12 + 90}deg)`}} />
          </div>
          {/* shelf */}
          <div style={{position: 'absolute', left: 60, top: 920, width: 300, height: 18, borderRadius: 6, background: '#D9D2C2'}} />
          {[0, 1, 2].map((i) => (
            <div key={i} style={{position: 'absolute', left: 80 + i * 90, top: 840 - (i % 2) * 20, width: 70, height: 80 + (i % 2) * 20, borderRadius: 10, background: [C.mintSoft, C.amberSoft, C.ivory][i], border: '2px solid rgba(25,43,42,0.08)'}} />
          ))}
        </div>

        {/* owner behind the counter */}
        <div style={{position: 'absolute', inset: 0, opacity: shopIn}}>
          <OwnerAt x={ownerX} y={1480} w={360} pose={pose} shadow={false} />
        </div>

        {/* counter */}
        <div style={{position: 'absolute', left: 60, top: 1170 + (1 - shopIn) * 400, width: 960, height: 700, opacity: shopIn}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 40, borderRadius: '16px 16px 4px 4px', background: 'linear-gradient(180deg, #FFFFFF, #E9E5DA)', boxShadow: '0 6px 0 #D8D1C1'}} />
          <div style={{position: 'absolute', left: 10, right: 10, top: 40, bottom: 0, background: `linear-gradient(170deg, ${C.tealBright}, ${C.teal} 50%, ${C.tealDeep})`, borderRadius: '0 0 18px 18px', boxShadow: '0 30px 60px -20px rgba(25,43,42,0.45)'}} />
          <div style={{position: 'absolute', left: 60, right: 60, top: 90, height: 4, background: 'rgba(255,255,255,0.18)', borderRadius: 2}} />
        </div>

        {/* phone: on the counter → in his hand → flips to the caller */}
        <div
          style={{
            position: 'absolute',
            left: lerp(760, 735, grab) - lerp(55, 85, grab) + jitter,
            top: lerp(960, 600, grab),
            perspective: 800,
            opacity: shopIn,
            transform: `rotate(${lerp(-8, 6, grab)}deg)`,
          }}
        >
          <Phone w={lerp(110, 170, grab)} flip={flip} ringing={t < Q.recordStop ? 1 : 0.4} screen="call" t={t} />
        </div>
        {ringT.map((p, i) =>
          p >= 0 ? (
            <div key={i} style={{position: 'absolute', left: 805 - p * 90, top: 1060 - p * 90, width: 180 * p + 20, height: 180 * p + 20, borderRadius: '50%', border: `5px solid ${C.amber}`, opacity: 1 - p}} />
          ) : null,
        )}

        {/* "3 days later" desk calendar → becomes the shop's wall calendar */}
        <div style={{position: 'absolute', left: lerp(540, 225, toWall) - lerp(210, 95, toWall), top: lerp(760, 610, toWall), perspective: 1000}}>
          <div style={{transform: `scale(${lerp(1, 0.45, toWall)})`, transformOrigin: '0 0'}}>
            <Calendar3D w={420} page={page} />
          </div>
        </div>
      </World>

      {/* typewritten title card */}
      {t < Q.daysLater + 1.1 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 290, textAlign: 'center', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 104, letterSpacing: '0.02em', color: C.charcoal, opacity: 1 - pr(t, Q.daysLater + 0.9, 0.2)}}>
          {'3 DAYS LATER...'.slice(0, Math.round(pr(t, Q.daysLater + 0.02, 0.55, EZ.linear) * 15))}
        </div>
      )}
      {/* record-stop flash */}
      <AbsoluteFill style={{background: C.amber, opacity: 0.18 * (1 - pr(t, Q.recordStop, 0.25)) * (t >= Q.recordStop ? 1 : 0), pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
