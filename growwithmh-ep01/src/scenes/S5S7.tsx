import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {C, FONT_DISPLAY} from '../theme';
import {EZ, Q, WORDS, lerp, pr} from '../timing';
import {Card3D, EDGE, Obj} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';
import {Disp, Neighborhood, PROFILE, ProfileCard, Seal, Txt} from '../props/Props';
import {Hl, Kicker, Wordmark3D} from '../components/Text';
import {Studio, World} from './common';

// =============================================================== SCENE 05 · LOCAL SEO, EXPLAINED (27.5 → 41.3 s)
const STEPS = [0, 1, 2, 3].map((i) => ({x: 150 + i * 190, top: 1180 - i * 150, w: 190}));
const FLOOR = 1330;

const Staircase: React.FC<{t: number}> = ({t}) => {
  const inP = (i: number) => pr(t, Q.heresThing + 0.2 + i * 0.08, 0.4, EZ.back);
  const arc = pr(t, Q.shortcut - 0.55, 0.45, EZ.inOut);
  const cross = pr(t, Q.shortcut, 0.25, EZ.back);
  const seal = pr(t, Q.verification, 0.35, EZ.back);
  const sx = STEPS[0].x + 95;
  const sy = STEPS[0].top - 20;
  const fx = STEPS[3].x + 95;
  const fy = STEPS[3].top - 40;
  const arcD = `M ${sx} ${sy - 50} Q ${(sx + fx) / 2} ${Math.min(sy, fy) - 420} ${fx} ${fy - 60}`;
  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {STEPS.map((s, i) => {
          const o = inP(i);
          const dy = (1 - o) * 260;
          const h = FLOOR - s.top;
          return (
            <g key={i} transform={`translate(0 ${dy})`} opacity={Math.min(1, o * 2)}>
              <path d={`M${s.x},${s.top} L${s.x + 40},${s.top - 34} L${s.x + s.w + 40},${s.top - 34} L${s.x + s.w},${s.top} Z`} fill="#FFFFFF" />
              <path d={`M${s.x + s.w},${s.top} L${s.x + s.w + 40},${s.top - 34} L${s.x + s.w + 40},${s.top - 34 + h} L${s.x + s.w},${s.top + h} Z`} fill="#D9D3C4" />
              <rect x={s.x} y={s.top} width={s.w} height={h} fill={i === 3 ? C.mintSoft : C.ivory} stroke="rgba(25,43,42,0.06)" strokeWidth={2} />
            </g>
          );
        })}
        {/* the "shortcut" attempt */}
        {arc > 0.005 && <path d={arcD} fill="none" stroke={cross > 0.5 ? C.amber : C.teal} strokeWidth={8} strokeDasharray="4 18" strokeLinecap="round" pathLength={1} style={{strokeDasharray: `${arc} 1`}} opacity={1 - pr(t, Q.top - 0.2, 0.3)} />}
        {/* flag at the top */}
        <g opacity={inP(3)}>
          <rect x={fx - 4} y={fy - 150} width={8} height={150} rx={4} fill={C.charcoal} />
          <path d={`M${fx + 4},${fy - 150} L${fx + 100},${fy - 125} L${fx + 4},${fy - 100} Z`} fill={C.teal} />
        </g>
      </svg>
      {/* verified seal sits on step one */}
      {seal > 0.01 && (
        <div style={{position: 'absolute', left: sx - 70, top: sy - 140 - (1 - seal) * 120, transform: `scale(${seal})`, transformOrigin: '50% 100%'}}>
          <Seal size={140} />
        </div>
      )}
      {cross > 0 && (
        <div style={{position: 'absolute', left: (sx + fx) / 2 - 80, top: Math.min(sy, fy) - 330, width: 160, height: 160, transform: `scale(${lerp(1.8, 1, cross)}) rotate(${lerp(-30, 0, cross)}deg)`, opacity: Math.min(1, cross * 2) * (1 - pr(t, Q.top - 0.2, 0.3))}}>
          <svg width={160} height={160} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={46} fill={C.paper} stroke={C.amber} strokeWidth={6} />
            <path d="M32 32 L68 68 M68 32 L32 68" stroke={C.amber} strokeWidth={10} strokeLinecap="round" />
          </svg>
        </div>
      )}
    </>
  );
};

const typed = (text: string, t: number, a: number, d: number) => text.slice(0, Math.round(Math.max(0, Math.min(1, (t - a) / d)) * text.length));

const SearchPanel: React.FC<{t: number}> = ({t}) => (
  <Card3D w={780} h={600} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 36, right: 36, top: 34, height: 92, borderRadius: 46, background: C.ivory, border: `2px solid ${C.hair}`, display: 'flex', alignItems: 'center', gap: 18, padding: '0 28px'}}>
      <Icon name="search" size={40} color={C.teal} stroke={2.4} />
      <Txt size={40} weight={600}>
        {typed('plumber near me', t, Q.local + 0.1, 0.8)}
        <span style={{display: 'inline-block', width: 3, height: 42, marginLeft: 3, background: C.teal, verticalAlign: 'middle', opacity: Math.floor(t * 4) % 2 ? 1 : 0.2}} />
      </Txt>
    </div>
    <div style={{position: 'absolute', left: 36, right: 36, top: 150, height: 250, borderRadius: 26, overflow: 'hidden'}}>
      <Neighborhood w={708} h={250} pins={pr(t, Q.local + 0.6, 0.8, EZ.linear) * 0.3} ownPin={pr(t, Q.local + 0.9, 0.3, EZ.back)} />
    </div>
    {[0, 1].map((i) => (
      <div key={i} style={{position: 'absolute', left: 36, right: 36, top: 424 + i * 76, height: 60, borderRadius: 16, background: C.ivory, display: 'flex', alignItems: 'center', gap: 16, padding: '0 18px'}}>
        <div style={{width: 36, height: 36, borderRadius: 10, background: i ? C.hair : C.teal}} />
        <div style={{width: i ? 260 : 320, height: 14, borderRadius: 7, background: C.hair}} />
      </div>
    ))}
    <div style={{position: 'absolute', right: 52, top: 166, padding: '6px 14px', borderRadius: 999, background: C.charcoal}}>
      <Txt size={22} color={C.cream} weight={700} style={{letterSpacing: '0.1em'}}>
        EXAMPLE
      </Txt>
    </div>
  </Card3D>
);

const FACTORS: Array<{key: 'relevance' | 'distance' | 'prominence'; title: string; line: string}> = [
  {key: 'relevance', title: 'RELEVANCE', line: 'Your profile matches the search'},
  {key: 'distance', title: 'DISTANCE', line: 'How close you are to the searcher'},
  {key: 'prominence', title: 'PROMINENCE', line: 'How well known your business is'},
];

const FactorVisual: React.FC<{k: string; p: number}> = ({k, p}) => {
  if (k === 'relevance')
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        <div style={{padding: '6px 12px', borderRadius: 999, background: C.paper, display: 'flex', gap: 6, alignItems: 'center'}}>
          <Icon name="search" size={20} color={C.muted} />
          <Txt size={20} weight={600}>plumber near me</Txt>
        </div>
        <div style={{width: 4, height: 26 * p, background: C.teal, borderRadius: 2}} />
        <div style={{padding: '6px 14px', borderRadius: 999, background: C.teal, display: 'flex', gap: 6, alignItems: 'center', opacity: p}}>
          <Icon name="check" size={20} color={C.cream} stroke={3} />
          <Txt size={22} color={C.cream} weight={700}>Plumber</Txt>
        </div>
      </div>
    );
  if (k === 'distance')
    return (
      <svg width={180} height={160} viewBox="0 0 180 160">
        <rect width={180} height={160} rx={18} fill="#1E3533" />
        {[40, 90, 140].map((v) => (
          <React.Fragment key={v}>
            <line x1={0} y1={v} x2={180} y2={v} stroke="rgba(183,216,197,0.3)" strokeWidth={5} />
            <line x1={v} y1={0} x2={v} y2={160} stroke="rgba(183,216,197,0.3)" strokeWidth={5} />
          </React.Fragment>
        ))}
        <circle cx={90} cy={80} r={20 + 46 * p} fill="rgba(23,97,90,0.35)" stroke={C.mint} strokeWidth={3} strokeDasharray="6 6" />
        <circle cx={90} cy={80} r={12} fill={C.amber} stroke={C.cream} strokeWidth={4} />
      </svg>
    );
  return (
    <div style={{display: 'flex', gap: 12}}>
      {(['link', 'page', 'chat'] as IconName[]).map((ic, i) => (
        <div key={ic} style={{width: 54, height: 54, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center', transform: `scale(${Math.max(0, Math.min(1, p * 3 - i))})`}}>
          <Icon name={ic} size={30} color={C.cream} />
        </div>
      ))}
    </div>
  );
};

const FactorCard: React.FC<{t: number; i: number}> = ({t, i}) => {
  const f = FACTORS[i];
  const at = Q[f.key];
  const p = pr(t, at - 0.05, 0.42, EZ.back);
  const leave = pr(t, Q.start - 0.4 + i * 0.05, 0.35, EZ.in);
  if (p <= 0 || leave >= 1) return null;
  const cy = 560 + i * 300;
  return (
    <Obj cx={540} cy={lerp(860, cy, p)} w={860} h={260} pose={{z: lerp(-500, 0, p) - leave * 300, rx: lerp(50, 3, p), ry: lerp(i === 1 ? 0 : i ? 18 : -18, 0, p), x: leave * (i % 2 ? 900 : -900), s: lerp(0.6, 1, p)}}>
      <Card3D w={860} h={260} depth={20} radius={34} face={C.paper} edge={EDGE.paper} lift={60} shadowColor="25,43,42">
        <div style={{position: 'absolute', left: 30, top: 30, width: 220, height: 200, borderRadius: 26, background: C.mintSoft, display: 'grid', placeItems: 'center'}}>
          <FactorVisual k={f.key} p={pr(t, at + 0.15, 0.5)} />
        </div>
        <div style={{position: 'absolute', left: 284, top: 54}}>
          <Disp size={60} weight={800} color={C.charcoal}>
            {f.title}
          </Disp>
          <Txt size={32} color={C.muted} weight={500} style={{marginTop: 14}}>
            {f.line}
          </Txt>
        </div>
        <div style={{position: 'absolute', right: 30, top: 30, width: 54, height: 54, borderRadius: '50%', border: `3px solid ${C.teal}`, display: 'grid', placeItems: 'center'}}>
          <Disp size={28} color={C.teal} weight={800}>
            {i + 1}
          </Disp>
        </div>
      </Card3D>
    </Obj>
  );
};

export const S5Explainer: React.FC<{t: number}> = ({t}) => {
  const stairsOut = pr(t, Q.top - 0.15, 0.4, EZ.in);
  const panelIn = pr(t, Q.local - 0.05, 0.45, EZ.back);
  const panelOut = pr(t, Q.relevance - 0.2, 0.3, EZ.in);
  const checkIn = pr(t, Q.start - 0.25, 0.45, EZ.back);
  const exit = pr(t, Q.grow - 0.35, 0.35, EZ.in);
  const cam = {x: 540, y: 900, s: 1 + 0.03 * Math.sin(t * 0.5)};
  const checks = [Q.accurate, Q.category, Q.stronger].map((c) => pr(t, c, 0.35, EZ.back));
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.heresThing, 0.25)}}>
      <Studio haloY={850} floorY={FLOOR} />
      <World cam={cam}>
        {stairsOut < 1 && (
          <div style={{position: 'absolute', inset: 0, transform: `translateX(${-stairsOut * 1100}px)`}}>
            <Staircase t={t} />
          </div>
        )}
        {panelIn > 0 && panelOut < 1 && (
          <Obj cx={540} cy={860} w={780} h={600} pose={{z: lerp(-500, 0, panelIn) - panelOut * 600, rx: lerp(40, 4, panelIn), ry: lerp(-20, -3, panelIn), s: 1 - panelOut * 0.4}}>
            <SearchPanel t={t} />
          </Obj>
        )}
        {[0, 1, 2].map((i) => (
          <FactorCard key={i} t={t} i={i} />
        ))}
        {checkIn > 0 && (
          <Obj cx={540} cy={820} w={PROFILE.w} h={PROFILE.h} pose={{z: lerp(-500, 0, checkIn), rx: lerp(40, 3, checkIn), ry: lerp(20, -3, checkIn) + exit * 90}}>
            <ProfileCard t={t} verifiedAt={-1} rows="checklist" checks={checks} ry={-3 + exit * 90} />
          </Obj>
        )}
      </World>
      <Kicker t={t} at={Q.shortcut - 0.05} out={Q.top - 0.2} lines={[<span key="n">NOT A <Hl>SHORTCUT</Hl></span>]} size={110} />
      <Kicker t={t} at={Q.start} out={Q.grow - 0.45} lines={[<span key="s">START <Hl>HERE</Hl></span>]} size={110} />
    </AbsoluteFill>
  );
};

// =============================================================== SCENE 07 · BRANDED OUTRO (41 → 46.5 s)
const WM = {size: 120, cy: 780};
const DOT = {x: 888, y: WM.cy + 30};
const wordStart = (w: string, n = 1) => WORDS.filter((x) => x.w.toLowerCase().replace(/[^a-z]/g, '') === w)[n - 1]?.s ?? 0;

export const S7Outro: React.FC<{t: number}> = ({t}) => {
  // the last checklist tick flies in and becomes the wordmark's dot
  const fly = pr(t, Q.grow - 0.3, 0.5, EZ.inOut);
  const reveal = pr(t, Q.grow, 0.55, EZ.inOut);
  const settle = pr(t, Q.grow, 0.8, EZ.out);
  const gx = lerp(540, DOT.x, fly);
  const gy = lerp(1000, DOT.y, fly);
  const gd = lerp(80, WM.size * 0.2, pr(t, Q.grow + 0.15, 0.4, EZ.inOut));
  const dotOn = t >= Q.grow + 0.55;
  const notAt = wordStart('not', 3) || Q.getFound + 0.6;
  const l1 = pr(t, Q.getFound, 0.4, EZ.back);
  const l2 = pr(t, notAt, 0.4, EZ.back);
  const sweep = pr(t, Q.grow + 0.45, 0.9, EZ.inOut);
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.grow - 0.35, 0.25)}}>
      <Studio haloY={WM.cy + 60} floorY={1500} />
      {sweep > 0 && sweep < 1 && <div style={{position: 'absolute', left: lerp(-300, 1200, sweep) - 160, top: WM.cy - 200, width: 320, height: 400, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(23,97,90,0.25), rgba(183,216,197,0))'}} />}
      <World cam={{x: 540, y: 900, s: 1 + 0.02 * pr(t, Q.grow, 5, EZ.linear)}} perspective={1600}>
        <div style={{position: 'absolute', left: 0, right: 0, top: WM.cy - WM.size * 0.6, height: WM.size * 1.2, display: 'flex', justifyContent: 'center', alignItems: 'center', transformStyle: 'preserve-3d'}}>
          <Wordmark3D size={WM.size} rx={lerp(28, 0, settle)} ry={lerp(-10, 0, settle)} clipRight={lerp(780, 0, reveal)} dotOpacity={dotOn ? 1 : 0} />
        </div>
      </World>
      {!dotOn && fly > 0 && (
        <div style={{position: 'absolute', left: gx - gd / 2, top: gy - gd / 2, width: gd, height: gd, borderRadius: '50%', background: interpolateColors(fly, [0, 1], [C.teal, '#DE8957']), display: 'grid', placeItems: 'center', boxShadow: '0 10px 24px -8px rgba(25,43,42,0.4)'}}>
          {gd > 40 && <Icon name="check" size={gd * 0.55} color={C.cream} stroke={3.2} />}
        </div>
      )}
      <div style={{position: 'absolute', left: 0, right: 0, top: 960, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, letterSpacing: '-0.02em', color: C.charcoal, opacity: Math.min(1, l1 * 2), transform: `translateY(${(1 - l1) * 40}px) scale(${0.9 + 0.1 * l1})`}}>Get Found.</div>
        <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 92, letterSpacing: '-0.02em', color: C.charcoal, opacity: Math.min(1, l2 * 2), transform: `translateY(${(1 - l2) * 40}px) scale(${0.9 + 0.1 * l2})`}}>
          Not Just <span style={{color: C.teal, fontStyle: 'italic', fontWeight: 600}}>Verified.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
