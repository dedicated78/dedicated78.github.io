import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, keyed, lerp, pr, voice} from '../timing';
import {OWNER_REST} from '../chars/Owner';
import {Pin, PIN_REST} from '../chars/Pin';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Calendar3D, Neighborhood, Phone, ProfileCard, PROFILE, QMark} from '../props/Props';
import {Hl, Kicker} from '../components/Text';
import {SpeedLines, Studio, World} from './common';
import {OwnerAt} from './S1S2';

const talk = (t: number, k = 1.5) => Math.min(1, voice(t) * k);

// =============================================================== SCENE 03 · THE CONFRONTATION (11 → 14.8 s)
export const S3Confrontation: React.FC<{t: number}> = ({t}) => {
  const inP = pr(t, Q.googleShout - 0.14, 0.32, EZ.out);
  const out = pr(t, Q.wait - 0.4, 0.4, EZ.inOut);
  const hit = pr(t, Q.where - 0.05, 0.3, EZ.out) - pr(t, Q.customersEnd, 0.5, EZ.inOut);
  const cam = {x: 540 - (1 - inP) * 900, y: 900, s: 1.08 + 0.07 * hit - 0.08 * out, rx: lerp(10, 0, out)};
  const shout = t < Q.wait;
  const pose = keyed(t, {...OWNER_REST, angry: 1, brow: -0.7, eyes: 1.2, smile: -0.2, lean: 8, head: -8, lookX: 0.7, lookY: -0.8, aRs: 150, aRe: 25, aLs: 55, aLe: 95}, [
    {t: Q.youVerified - 0.05, d: 0.2, aLs: 108, aLe: 8, lookX: 0.9},
    {t: Q.where - 0.05, d: 0.2, e: EZ.back, aLs: 135, aLe: 30, lean: 2, head: 0, lookX: 0, lookY: 0, eyes: 1.3, bob: -14},
    {t: Q.customersEnd, d: 0.3, bob: 0, aLs: 60, aLe: 60},
  ]);
  pose.mouth = talk(t, 1.7);
  if (shout) pose.aLe += Math.sin(t * 28) * 8;
  const qs = [
    {x: 190, y: 720, d: 0, c: C.teal, dc: C.tealDeep, s: 150},
    {x: 930, y: 1020, d: 0.15, c: C.amber, dc: '#A9762F', s: 130},
    {x: 170, y: 1150, d: 0.32, c: C.teal, dc: C.tealDeep, s: 110},
    {x: 330, y: 560, d: 0.45, c: C.tealBright, dc: C.tealDeep, s: 96},
  ];
  return (
    <AbsoluteFill>
      <Studio haloX={760} haloY={700} floorY={1300} />
      <SpeedLines o={pr(t, Q.googleShout - 0.1, 0.2) * (1 - out)} t={t} x={780} y={760} />
      <World cam={cam}>
        <div style={{position: 'absolute', left: 800 - 100 + Math.sin(t * 40) * 3 * (shout ? 1 : 0), top: 560, perspective: 900, transform: 'rotate(-10deg)'}}>
          <Phone w={200} flip={1} ringing={0} screen="profile" t={t} />
        </div>
        <OwnerAt x={420} y={1360} w={420} pose={pose} />
        {qs.map((q, i) => {
          const p = pr(t, Q.where + q.d, 0.3, EZ.back) * (1 - out);
          if (p <= 0) return null;
          return (
            <div key={i} style={{position: 'absolute', left: q.x - q.s * 0.3, top: q.y - q.s * 0.6 + Math.sin(t * 3 + i) * 10, transform: `scale(${p}) rotate(${Math.sin(t * 2.4 + i) * 12}deg) rotateY(${Math.sin(t * 1.7 + i) * 30}deg)`, transformStyle: 'preserve-3d'}}>
              <QMark size={q.s} color={q.c} depthColor={q.dc} />
            </div>
          );
        })}
      </World>
      <Kicker t={t} at={Q.where} out={Q.wait - 0.5} lines={['WHERE ARE MY', <Hl key="c">CUSTOMERS?</Hl>]} size={100} top={250} />
    </AbsoluteFill>
  );
};

// =============================================================== SCENE 04 · THE ASSISTANT (14.5 → 27.9 s)
export const S4Assistant: React.FC<{t: number}> = ({t}) => {
  const tileIn = pr(t, Q.wait - 0.45, 0.45, EZ.out);
  const rise = pr(t, Q.wait - 0.2, 0.55, EZ.back);
  const grow = pr(t, Q.promise - 0.2, 0.9, EZ.inOut); // map expands to the whole neighbourhood
  const dolly = pr(t, Q.sir - 0.2, 0.8, EZ.inOut);
  const through = pr(t, Q.heresThing - 0.25, 0.42, EZ.in); // push-through the calendar page

  const cam = {x: lerp(540, 620, dolly) - grow * 80, y: lerp(900, 880, dolly), s: lerp(1, 1.1, dolly) - grow * 0.16};

  // owner
  const o = keyed(t, {...OWNER_REST, angry: 0.3, brow: -0.2, smile: -0.2, lookX: 0.8}, [
    {t: Q.wait - 0.1, d: 0.2, e: EZ.back, bob: -24, eyes: 1.35, sweat: 1, angry: 0, brow: 0.8, aLs: 70, aLe: 60, aRs: 70, aRe: 60},
    {t: Q.wait + 0.25, d: 0.2, bob: 0},
    {t: Q.wait + 0.55, d: 0.35, aLs: 165, aLe: 130, aRs: 10, aRe: 20, brow: 0.9, smile: -0.35, head: 8, eyes: 1.1, lookX: 0.7, lookY: -0.2},
    {t: Q.soNo - 0.1, d: 0.3, e: EZ.back, aLs: 48, aLe: 142, aRs: 48, aRe: 142, head: -4, eyes: 1.3, smile: 0.7, brow: 0.7, sweat: 0, lookX: 0.5, lookY: -0.6},
    {t: Q.sir, d: 0.4, aLs: 10, aLe: 20, aRs: 10, aRe: 20, smile: -0.1, eyes: 0.95, head: 4, lookX: 0.8, lookY: 0},
    {t: Q.manage, d: 0.4, blush: 0.5, smile: -0.25},
    {t: Q.calendar + 0.05, d: 0.45, e: EZ.soft, bob: 10, smile: -0.7, eyes: 0.55, aLs: 2, aLe: 0, aRs: 2, aRe: 0, head: 10, lookX: 0.3, brow: 0.4},
  ]);
  o.mouth = t < Q.sir ? talk(t) : 0;
  if (t > Q.soNo && t < Q.fridayEnd) o.bob -= voice(t) * 18;

  // assistant
  const p = keyed(t, {...PIN_REST, eyes: 0.05}, [
    {t: Q.wait + 0.1, d: 0.3, eyes: 1},
    {t: Q.numberOne, d: 0.25, brow: 1, lookX: -0.5},
    {t: Q.numberOneEnd + 0.3, d: 0.3, brow: 0, lookX: -0.4},
    {t: Q.millionaire, d: 0.3, lookX: -0.2, lookY: -0.8},
    {t: Q.sir - 0.1, d: 0.3, lookX: 0, lookY: 0},
    {t: Q.neighborhood - 0.2, d: 0.3, lookY: 0.6, lookX: -0.3},
    {t: Q.notOnMy, d: 0.25, lookX: -0.6, lookY: -0.7},
    {t: Q.calendarEnd + 0.05, d: 0.2, lookX: 0, lookY: 0},
    {t: Q.calendarEnd + 0.22, d: 0.06, eyes: 0.05},
    {t: Q.calendarEnd + 0.32, d: 0.08, eyes: 1},
  ]);
  p.talk = t >= Q.sir - 0.1 && t < Q.heresThing - 0.1 ? Math.min(1, voice(t) * 1.6) : 0;
  p.tilt = Math.sin(t * 1.3) * 3;
  const bob = Math.sin(t * 2.2) * 10;

  // calendar: arrives for "Friday?", leaves for the assistant's answer, returns for the punchline
  const calIn = pr(t, Q.soNo + 0.3, 0.45, EZ.back) * (1 - pr(t, Q.sir + 0.2, 0.35, EZ.in));
  const calBack = pr(t, Q.notOnMy - 0.25, 0.4, EZ.back);
  const page = 3 + 0.14 * pr(t, Q.millionaire, 0.35, EZ.out) + 0.86 * pr(t, Q.friday - 0.12, 0.3, EZ.inOut);
  const note = pr(t, Q.fridayEnd, 0.3, EZ.back);
  const strike = pr(t, Q.calendar + 0.05, 0.28, EZ.inOut);
  const calShow = Math.max(calIn, calBack);
  const calScale = lerp(1, 7, through);

  // profile card during "Sir, I verified..."
  const cardIn = pr(t, Q.sir + 0.25, 0.45, EZ.back) * (1 - pr(t, Q.promise - 0.3, 0.35, EZ.in));
  const tileW = lerp(400, 1500, grow);

  return (
    <AbsoluteFill style={{opacity: pr(t, Q.wait - 0.45, 0.2)}}>
      <Studio haloX={760} haloY={900} floorY={1290} />
      <World cam={cam}>
        {/* dimensional map tile: the assistant's home; expands to the whole neighbourhood */}
        <Obj cx={lerp(760, 560, grow)} cy={lerp(1330, 1320, grow)} w={tileW} h={tileW} pose={{rx: lerp(90, 66, tileIn) - grow * 6, s: lerp(0.4, 1, tileIn)}}>
          <Card3D w={tileW} h={tileW} depth={lerp(22, 40, grow)} step={4} radius={lerp(40, 90, grow)} face="#1E3533" edge={EDGE.dark} border="3px solid rgba(183,216,197,0.35)" lift={30} shadow={0.6} glow={`0 0 ${60 + 40 * rise}px rgba(183,216,197,${0.35 * rise})`}>
            <Neighborhood w={tileW} h={tileW} pins={pr(t, Q.promise + 0.3, 1, EZ.linear)} ownPin={grow} />
          </Card3D>
        </Obj>
        {/* light column as the assistant rises */}
        {rise > 0 && rise < 1 && (
          <div style={{position: 'absolute', left: 760 - 120, top: 900, width: 240, height: 430, background: 'linear-gradient(0deg, rgba(183,216,197,0.55), rgba(183,216,197,0))', opacity: 1 - rise, filter: 'blur(8px)'}} />
        )}
        <div style={{position: 'absolute', left: 760 - 115, top: 1290 - 307 - 40 * rise + bob * rise + (1 - rise) * 160, transform: `scale(${rise})`, transformOrigin: '50% 100%'}}>
          <Pin pose={p} width={230} t={t} />
        </div>
        <OwnerAt x={300} y={1370} w={330} pose={o} />

        {/* profile card: "you can manage it" */}
        {cardIn > 0 && (
          <Obj cx={600} cy={590 - (1 - cardIn) * 120} w={PROFILE.w} h={PROFILE.h} pose={{s: 0.82 * cardIn, rx: (1 - cardIn) * 40}}>
            <ProfileCard t={t} verifiedAt={-1} manageNote={pr(t, Q.manage, 0.35, EZ.back)} rows="actions" />
          </Obj>
        )}

        {/* the calendar */}
        {calShow > 0 && (
          <div style={{position: 'absolute', left: 560 - 170, top: lerp(-300, 470, calShow), perspective: 1100, transform: `rotate(${(1 - calShow) * -12}deg)`}}>
            <div style={{transform: `scale(${calScale})`, transformOrigin: '50% 30%'}}>
              <Calendar3D w={340} page={page} note={note} noteStrike={strike} />
            </div>
          </div>
        )}
      </World>
      <Kicker t={t} at={Q.numberOne} out={Q.soNo + 0.25} lines={[<span key="v">VERIFIED <Hl>≠ #1</Hl></span>]} size={122} top={262} />
      {/* white flash as we push through the calendar page */}
      <AbsoluteFill style={{background: C.paper, opacity: pr(t, Q.heresThing - 0.05, 0.12)}} />
    </AbsoluteFill>
  );
};
