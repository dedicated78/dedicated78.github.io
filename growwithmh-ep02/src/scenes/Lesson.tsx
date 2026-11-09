import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {C, FONT_DISPLAY} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Icon} from '../components/Icons';
import {Hl, Kicker, Wordmark3D} from '../components/Text';
import {Disp, Txt} from '../props/Props';
import {CUSTOMER, CustomerView, INFO_CARD, InfoCard, InfoKey, LogoTile, RankNote, RoofGlyph} from '../props/Ep02Props';
import {Studio, World} from './common';

// =============================================================== SCENE 04 · THE LESSON (narrator)
const PANEL = {w: 860, h: 620};
const LessonPanel: React.FC<{what: number; when: number}> = ({what, when}) => {
  const row = (label: string, value: string, icon: React.ReactNode, p: number) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 22, padding: '0 28px', height: 132, borderRadius: 28, background: p > 0.02 ? `rgba(183,216,197,${0.18 + 0.32 * p})` : C.ivory, boxShadow: p > 0.02 ? `0 0 0 ${3 * p}px rgba(23,97,90,0.5)` : undefined, transform: `scale(${1 + 0.03 * p})`}}>
      <div style={{width: 82, height: 82, borderRadius: 24, background: p > 0.5 ? C.teal : C.mintSoft, display: 'grid', placeItems: 'center'}}>{icon}</div>
      <div>
        <Txt size={26} color={C.muted} weight={600} style={{letterSpacing: '0.06em'}}>
          {label}
        </Txt>
        <Disp size={40} weight={700} style={{marginTop: 6}}>
          {value}
        </Disp>
      </div>
    </div>
  );
  return (
    <Card3D w={PANEL.w} h={PANEL.h} depth={24} radius={42} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 44, top: 44, display: 'flex', gap: 22, alignItems: 'center'}}>
        <div style={{width: 96, height: 96, borderRadius: 26, background: C.teal, display: 'grid', placeItems: 'center'}}>
          <RoofGlyph size={56} />
        </div>
        <div>
          <Disp size={46}>Example Roofing Co.</Disp>
          <Txt size={26} color={C.muted} weight={500} style={{marginTop: 8}}>
            Business Profile · example
          </Txt>
        </div>
      </div>
      <div style={{position: 'absolute', left: 44, right: 44, top: 180, height: 2, background: C.creamLine}} />
      <div style={{position: 'absolute', left: 44, right: 44, top: 212, display: 'flex', flexDirection: 'column', gap: 22}}>
        {row('WHAT YOU DO', 'Roofing contractor', <RoofGlyph size={46} color={what > 0.5 ? C.cream : C.teal} />, what)}
        {row("WHEN YOU'RE AVAILABLE", 'Mon – Fri · Sun closed', <Icon name="clock" size={44} color={when > 0.5 ? C.cream : C.teal} />, when)}
      </div>
    </Card3D>
  );
};

const SLOTS: Array<{k: InfoKey; x: number; y: number; at: () => number}> = [
  {k: 'category', x: 300, y: 650, at: () => Q.cat12},
  {k: 'hours', x: 780, y: 650, at: () => Q.hours12},
  {k: 'services', x: 300, y: 975, at: () => Q.services},
  {k: 'contact', x: 780, y: 975, at: () => Q.contact},
];

export const Lesson: React.FC<{t: number}> = ({t}) => {
  const enter = pr(t, Q.manager + 1.0, 0.6, EZ.out); // continues the push into the card
  const panelOut = pr(t, Q.review - 0.15, 0.55, EZ.in);
  const gridAway = pr(t, Q.accurate13 + 0.45, 0.55, EZ.in);
  const custIn = pr(t, Q.accurate13 + 0.55, 0.6, EZ.back);
  const exit = pr(t, Q.L13e + 0.05, 0.5, EZ.in);
  const cam = {
    x: 540,
    y: 900,
    s: lerp(1.25, 1, enter) + 0.03 * pr(t, Q.L12, 4, EZ.linear) + exit * 0.5,
    rx: lerp(6, 0, pr(t, Q.L12 - 0.2, 1.4, EZ.inOut)) * (1 - gridAway),
    rz: lerp(-1.2, 1.2, pr(t, Q.L12, 3.6, EZ.inOut)) * (1 - gridAway),
  };
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.manager + 1.15, 0.25) * (1 - pr(t, Q.L13e + 0.3, 0.3))}}>
      <Studio haloY={800} floorY={1500} />
      <World cam={cam} perspective={1700}>
        {panelOut < 1 && (
          <Obj cx={540} cy={760} w={PANEL.w} h={PANEL.h} pose={{z: -panelOut * 900, rx: lerp(2, 30, panelOut) + Math.sin(t * 0.7) * 2, ry: Math.sin(t * 0.5) * 4, y: -panelOut * 200}}>
            <LessonPanel what={pr(t, Q.whatYouDo - 0.05, 0.35, EZ.back)} when={pr(t, Q.whenAvail - 0.05, 0.35, EZ.back)} />
          </Obj>
        )}
        {SLOTS.map((s, i) => {
          const p = pr(t, s.at() - 0.08, 0.5, EZ.back);
          if (p <= 0 || gridAway >= 1) return null;
          const check = pr(t, Q.accurate13 + i * 0.1, 0.25, EZ.back);
          return (
            <Obj
              key={s.k}
              cx={s.x}
              cy={s.y}
              w={INFO_CARD.w}
              h={INFO_CARD.h}
              pose={{
                x: lerp(540 - s.x, 0, p) + gridAway * (s.x < 540 ? -900 : 900),
                y: lerp(760 - s.y, 0, p) - gridAway * 120,
                z: lerp(-500, 0, p) - gridAway * 300,
                rx: lerp(35, 0, p),
                ry: lerp(s.x < 540 ? -30 : 30, 0, p) + gridAway * (s.x < 540 ? -40 : 40),
                s: 0.92 * lerp(0.7, 1, p),
              }}
            >
              <InfoCard k={s.k} n={i + 1} check={check} />
            </Obj>
          );
        })}
        {custIn > 0 && (
          <Obj cx={540} cy={890} w={CUSTOMER.w} h={CUSTOMER.h} pose={{z: lerp(-500, 0, custIn), rx: lerp(30, 3, custIn), ry: Math.sin(t * 0.6) * 3, s: 0.98}}>
            <CustomerView p={pr(t, Q.accurate13 + 0.9, 0.4)} know={pr(t, Q.decisions - 0.05, 0.45, EZ.back)} />
          </Obj>
        )}
      </World>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1218, display: 'flex', justifyContent: 'center'}}>
        <RankNote p={pr(t, Q.doesnt - 0.05, 0.4, EZ.back)} strike={pr(t, Q.guarantee + 0.05, 0.35, EZ.inOut)} />
      </div>
      <Kicker t={t} at={Q.accurate13} out={Q.doesnt - 0.35} lines={[<span key="a">ACCURATE</span>, <Hl key="b">INFORMATION</Hl>, <span key="c">MATTERS.</span>]} size={92} />
      {/* bright push-through back to the set */}
      <AbsoluteFill style={{background: C.paper, opacity: pr(t, Q.L13e + 0.2, 0.15)}} />
    </AbsoluteFill>
  );
};

// =============================================================== SCENE 06 · BRANDED OUTRO (Episode 01 system + supplied logo)
const LOGO = {size: 290, cy: 560};
const WM = {size: 104, cy: 845};
const DOT = {x: 540 + 345, y: WM.cy + 26};

export const Outro: React.FC<{t: number}> = ({t}) => {
  // a teal check flies in and becomes the wordmark's dot, as in Episode 01; the logo tile turns to face us
  const fly = pr(t, Q.outro + 0.05, 0.5, EZ.inOut);
  const logoIn = pr(t, Q.grow - 0.15, 0.6, EZ.back);
  const reveal = pr(t, Q.grow + 0.05, 0.55, EZ.inOut);
  const settle = pr(t, Q.grow, 0.8, EZ.out);
  const gx = lerp(560, DOT.x, fly);
  const gy = lerp(1150, DOT.y, fly);
  const gd = lerp(84, WM.size * 0.2, pr(t, Q.outro + 0.35, 0.35, EZ.inOut));
  const dotOn = t >= Q.outro + 0.6;
  const l1 = pr(t, Q.getFound, 0.4, EZ.back);
  const l2 = pr(t, Q.stay, 0.4, EZ.back);
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
          Stay <span style={{color: C.teal, fontStyle: 'italic', fontWeight: 600}}>Accurate.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
