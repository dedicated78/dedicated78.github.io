import React from 'react';
import {C} from '../theme';
import {lerp} from '../timing';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';
import {Disp, Txt} from './Props';
import {RoofGlyph} from './Ep02Props';

// Episode 03 props. Areas are illustrative (fictional names, no addresses); the New York map is a
// stylised fantasy, not a geographic or ranking claim. Nothing shows positions, ratings or results.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const pad2 = (n: number) => String(n).padStart(2, '0');

// ---------------------------------------------------------------- service-area settings panel
export const PANEL = {w: 560, h: 660};
const MINI_PINS: Array<[number, number]> = [
  [120, 90], [300, 70], [400, 150], [190, 170], [330, 220], [90, 240], [250, 120], [430, 60], [150, 40], [370, 270],
];
const AREAS = ['Northside', 'Riverside', 'Eastview', 'Hillcrest'];
/** count: the number shown (01→20); pins/areas: 0..1 how far the map has filled. */
export const ServiceAreaPanel: React.FC<{count: number; pins: number; areas: number; saved?: number}> = ({count, pins, areas, saved = 0}) => (
  <Card3D w={PANEL.w} h={PANEL.h} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 36, top: 34, display: 'flex', alignItems: 'center', gap: 16}}>
      <div style={{width: 72, height: 72, borderRadius: 22, background: C.teal, display: 'grid', placeItems: 'center'}}>
        <Icon name="pin" size={40} color={C.cream} />
      </div>
      <div>
        <Disp size={40}>Service areas</Disp>
        <Txt size={22} color={C.muted} weight={500} style={{marginTop: 4}}>
          Business Profile · example
        </Txt>
      </div>
    </div>
    {/* counter */}
    <div style={{position: 'absolute', right: 36, top: 36, padding: '8px 18px', borderRadius: 20, background: C.mintSoft, display: 'flex', alignItems: 'baseline', gap: 4}}>
      <Disp size={52} weight={800} color={C.teal}>
        {pad2(Math.max(1, Math.round(count)))}
      </Disp>
      <Txt size={24} weight={700} color={C.muted}>
        /20
      </Txt>
    </div>
    {/* mini map */}
    <div style={{position: 'absolute', left: 36, right: 36, top: 140, height: 330, borderRadius: 26, overflow: 'hidden', background: '#1E3533'}}>
      <svg width="100%" height="100%" viewBox="0 0 488 330" preserveAspectRatio="xMidYMid slice">
        <rect width={488} height={330} fill="#1E3533" />
        {[60, 140, 220, 300].map((y) => (
          <path key={y} d={`M0 ${y} H488`} stroke="rgba(183,216,197,0.18)" strokeWidth={8} />
        ))}
        {[80, 200, 320, 440].map((x) => (
          <path key={x} d={`M${x} 0 V330`} stroke="rgba(183,216,197,0.18)" strokeWidth={8} />
        ))}
        <path d="M0 250 C 120 220, 220 290, 340 250 S 470 220, 488 236" stroke="rgba(23,97,90,0.95)" strokeWidth={22} fill="none" />
        {/* highlighted areas expanding */}
        {[[150, 120, 90], [320, 170, 110], [230, 250, 80]].map(([x, y, r], i) => {
          const p = clamp01(areas * 3 - i);
          return p > 0 ? <circle key={i} cx={x} cy={y} r={r * p} fill="rgba(42,128,119,0.35)" stroke="rgba(183,216,197,0.7)" strokeWidth={3} strokeDasharray="8 8" /> : null;
        })}
        {MINI_PINS.map(([x, y], i) => {
          const p = clamp01(pins * MINI_PINS.length - i);
          if (p <= 0) return null;
          return (
            <g key={i} transform={`translate(${x} ${y - (1 - p) * 30}) scale(${p})`}>
              <path d="M0 0 C -8 -10, -12 -16, -12 -22 A12 12 0 1 1 12 -22 C 12 -16, 8 -10, 0 0 Z" fill={i % 3 ? C.mint : C.amber} stroke={C.cream} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {AREAS.map((a, i) => {
        const p = clamp01(areas * 4 - i);
        const pos = [[24, 24], [250, 40], [70, 200], [270, 230]][i];
        return (
          <div key={a} style={{position: 'absolute', left: pos[0], top: pos[1], padding: '4px 12px', borderRadius: 999, background: 'rgba(251,250,246,0.92)', opacity: p, transform: `scale(${0.7 + 0.3 * p})`, transformOrigin: '0 50%'}}>
            <Txt size={20} weight={700}>
              {a}
            </Txt>
          </div>
        );
      })}
    </div>
    <div style={{position: 'absolute', left: 36, right: 36, top: 492, display: 'flex', flexWrap: 'wrap', gap: 10}}>
      {['Northside', 'Riverside', 'Eastview', 'Hillcrest', `+${Math.max(0, Math.round(count) - 4)} more`].map((c, i) => {
        const p = clamp01(areas * 5 - i);
        return (
          <div key={i} style={{padding: '8px 16px', borderRadius: 999, background: i === 4 ? C.teal : C.ivory, opacity: p, transform: `translateY(${(1 - p) * 10}px)`}}>
            <Txt size={22} weight={700} color={i === 4 ? C.cream : C.charcoal}>
              {c}
            </Txt>
          </div>
        );
      })}
    </div>
    {saved > 0.01 && (
      <div style={{position: 'absolute', left: 36, right: 36, bottom: 30, height: 58, borderRadius: 18, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: saved}}>
        <Icon name="check" size={28} color={C.cream} stroke={3} />
        <Txt size={26} weight={700} color={C.cream}>
          Save
        </Txt>
      </div>
    )}
  </Card3D>
);

// ---------------------------------------------------------------- the fantasy: stylised New York map
export const NYC = {w: 760, h: 560};
const BOROUGHS: Array<{k: string; d: string; label: [number, number]; pin: [number, number]}> = [
  {k: 'Manhattan', d: 'M300 40 C 322 60, 330 150, 322 250 C 316 330, 300 380, 286 400 C 276 380, 270 300, 274 220 C 278 140, 286 70, 300 40 Z', label: [190, 170], pin: [302, 210]},
  {k: 'Brooklyn', d: 'M300 430 C 360 400, 440 410, 470 450 C 500 490, 460 530, 400 530 C 340 532, 300 510, 290 480 Z', label: [330, 505], pin: [392, 470]},
  {k: 'Queens', d: 'M372 300 C 450 270, 600 280, 660 330 C 700 370, 670 440, 600 450 C 520 462, 470 430, 420 400 C 380 380, 360 330, 372 300 Z', label: [520, 345], pin: [540, 380]},
  {k: '', d: 'M330 40 C 380 20, 470 30, 500 70 C 520 110, 470 150, 420 160 C 380 168, 350 140, 340 110 Z', label: [0, 0], pin: [430, 100]},
  {k: '', d: 'M60 430 C 100 400, 180 410, 200 450 C 220 490, 170 530, 110 530 C 70 528, 40 470, 60 430 Z', label: [0, 0], pin: [128, 470]},
];
const SPREAD: Array<[number, number]> = [
  [296, 120], [310, 300], [430, 470], [360, 500], [600, 320], [480, 400], [640, 400], [450, 90], [400, 130], [110, 450], [160, 500], [520, 300], [300, 360], [420, 430],
];
export const NycMap: React.FC<{t: number; boroughs: number[]; spread: number; frozen: number}> = ({t, boroughs, spread, frozen}) => {
  const live = 1 - frozen; // everything stops moving when the assistant interrupts
  return (
    <Card3D w={NYC.w} h={NYC.h} depth={24} radius={40} face="#E7EFEA" edge={EDGE.mint} lift={70} shadowColor="25,43,42">
      <svg width={NYC.w} height={NYC.h} viewBox="0 0 760 560" style={{position: 'absolute', inset: 0}}>
        <rect width={760} height={560} fill="#CFE3E6" />
        {/* water ripples */}
        {[120, 260, 400].map((y, i) => (
          <path key={y} d={`M0 ${y} Q 190 ${y - 14} 380 ${y} T 760 ${y}`} stroke="rgba(255,255,255,0.45)" strokeWidth={3} fill="none" transform={`translate(${(Math.sin(t * 0.8 * live + i) * 10).toFixed(2)} 0)`} />
        ))}
        {BOROUGHS.map((b, i) => (
          <path key={i} d={b.d} fill={b.k && (boroughs[['Brooklyn', 'Queens', 'Manhattan'].indexOf(b.k)] ?? 0) > 0.5 ? '#BFDCCB' : '#E6EFE2'} stroke="#9FC2AE" strokeWidth={3} />
        ))}
        {SPREAD.map(([x, y], i) => {
          const p = clamp01(spread * SPREAD.length - i);
          if (p <= 0) return null;
          const hop = live * Math.abs(Math.sin(t * 5 + i)) * 4;
          return (
            <g key={i} transform={`translate(${x} ${y - hop - (1 - p) * 30}) scale(${0.7 * p})`}>
              <path d="M0 0 C -8 -10, -12 -16, -12 -22 A12 12 0 1 1 12 -22 C 12 -16, 8 -10, 0 0 Z" fill={C.teal} stroke={C.cream} strokeWidth={2.5} />
            </g>
          );
        })}
      </svg>
      {BOROUGHS.filter((b) => b.k).map((b) => {
        const p = boroughs[['Brooklyn', 'Queens', 'Manhattan'].indexOf(b.k)] ?? 0;
        if (p <= 0) return null;
        return (
          <React.Fragment key={b.k}>
            <div style={{position: 'absolute', left: b.pin[0] - 22, top: b.pin[1] - 56 - (1 - p) * 40, transform: `scale(${p})`, transformOrigin: '50% 100%'}}>
              <svg width={44} height={56} viewBox="-22 -50 44 56">
                <path d="M0 4 C -12 -10, -18 -20, -18 -30 A18 18 0 1 1 18 -30 C 18 -20, 12 -10, 0 4 Z" fill={C.amber} stroke={C.cream} strokeWidth={3} />
                <circle cx={0} cy={-30} r={7} fill={C.cream} />
              </svg>
            </div>
            <div style={{position: 'absolute', left: b.label[0], top: b.label[1], padding: '6px 14px', borderRadius: 999, background: C.paper, boxShadow: '0 6px 14px -8px rgba(25,43,42,0.5)', opacity: p, transform: `scale(${0.8 + 0.2 * p})`}}>
              <Txt size={26} weight={700}>
                {b.k}
              </Txt>
            </div>
          </React.Fragment>
        );
      })}
      <div style={{position: 'absolute', left: 24, top: 20, padding: '4px 12px', borderRadius: 999, background: 'rgba(25,43,42,0.75)'}}>
        <Txt size={18} weight={700} color={C.cream} style={{letterSpacing: '0.12em'}}>
          IMAGINATION
        </Txt>
      </div>
    </Card3D>
  );
};

// ---------------------------------------------------------------- "you made a list"
export const LIST = {w: 520, h: 600};
const LIST_ROWS = ['Brooklyn', 'Queens', 'Manhattan', 'Northside', 'Riverside', 'Eastview'];
export const AreaList: React.FC<{p: number; serve?: number}> = ({p, serve = 0}) => (
  <Card3D w={LIST.w} h={LIST.h} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 36, top: 32, right: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
      <Disp size={40}>Service areas</Disp>
      <div style={{padding: '4px 14px', borderRadius: 999, background: C.mintSoft}}>
        <Txt size={24} weight={700} color={C.teal}>
          20 of 20
        </Txt>
      </div>
    </div>
    <div style={{position: 'absolute', left: 36, right: 36, top: 112, display: 'flex', flexDirection: 'column', gap: 10}}>
      {LIST_ROWS.map((r, i) => {
        const q = clamp01(p * LIST_ROWS.length - i);
        return (
          <div key={r} style={{height: 58, borderRadius: 16, background: C.ivory, display: 'flex', alignItems: 'center', gap: 14, padding: '0 16px', opacity: clamp01(q * 2), transform: `translateX(${(1 - q) * 30}px)`}}>
            <div style={{width: 30, height: 30, borderRadius: 8, background: C.teal, display: 'grid', placeItems: 'center'}}>
              <Icon name="check" size={20} color={C.cream} stroke={3.2} />
            </div>
            <Txt size={28} weight={600}>
              {r}
            </Txt>
          </div>
        );
      })}
      <Txt size={24} color={C.muted} weight={600} style={{textAlign: 'center', opacity: clamp01(p * 2 - 1)}}>
        + 14 more
      </Txt>
    </div>
    {serve > 0.01 && (
      <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, height: 76, borderRadius: 20, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: serve, transform: `translateY(${(1 - serve) * 20}px)`}}>
        <Icon name="pin" size={30} color={C.cream} />
        <Txt size={28} weight={700} color={C.cream}>
          Where you're willing to work
        </Txt>
      </div>
    )}
  </Card3D>
);

// ---------------------------------------------------------------- fantasy props
export const Crown: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={w * 0.72} viewBox="0 0 100 72" style={{overflow: 'visible'}}>
    <path d="M8 62 L4 18 L28 38 L50 6 L72 38 L96 18 L92 62 Z" fill={C.amber} stroke="#A9762F" strokeWidth={3} strokeLinejoin="round" />
    <rect x={8} y={58} width={84} height={12} rx={4} fill="#C58A3E" stroke="#A9762F" strokeWidth={2.5} />
    {[[4, 18], [50, 6], [96, 18]].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r={5.5} fill={C.cream} stroke="#A9762F" strokeWidth={2} />
    ))}
    <circle cx={50} cy={44} r={7} fill={C.teal} />
  </svg>
);

/** Thin projected spotlight cone. */
export const Spotlight: React.FC<{w: number; h: number; o: number}> = ({w, h, o}) => (
  <div style={{width: w, height: h, opacity: o, background: 'linear-gradient(180deg, rgba(255,244,214,0) 0%, rgba(255,244,214,0.55) 60%, rgba(255,240,200,0.75) 100%)', clipPath: 'polygon(42% 0, 58% 0, 100% 100%, 0 100%)', filter: 'blur(2px)'}} />
);

/** Comedy teleport portal: an upright glowing ring that can collapse into a map pin. */
export const Portal: React.FC<{w: number; t: number; open: number}> = ({w, t, open}) => {
  const h = w * 1.55;
  return (
    <svg width={w} height={h} viewBox="0 0 100 155" style={{overflow: 'visible'}}>
      <defs>
        <radialGradient id="portalCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E9FFF6" />
          <stop offset="55%" stopColor="#7ED3C1" />
          <stop offset="100%" stopColor="#17615A" />
        </radialGradient>
      </defs>
      <g transform={`translate(50 77) scale(${open}) translate(-50 -77)`}>
        <ellipse cx={50} cy={77} rx={46} ry={74} fill="url(#portalCore)" opacity={0.92} />
        {[0, 1, 2].map((i) => (
          <ellipse key={i} cx={50} cy={77} rx={40 - i * 11} ry={66 - i * 18} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5} strokeDasharray="14 10" transform={`rotate(${(t * (90 + i * 50)) % 360} 50 77)`} />
        ))}
        <ellipse cx={50} cy={77} rx={46} ry={74} fill="none" stroke={C.teal} strokeWidth={5} />
      </g>
    </svg>
  );
};

/** Floating "SAVED" confirmation chip. */
export const SavedBadge: React.FC<{p: number}> = ({p}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '14px 26px', borderRadius: 999, background: C.paper, boxShadow: '0 18px 36px -16px rgba(25,43,42,0.55), 0 0 0 2px rgba(23,97,90,0.12)', opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 30}px) scale(${0.8 + 0.2 * p})`}}>
    <div style={{width: 44, height: 44, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
      <Icon name="check" size={28} color={C.cream} stroke={3.4} />
    </div>
    <Disp size={40} weight={800} color={C.charcoal} style={{letterSpacing: '0.06em'}}>
      SAVED
    </Disp>
  </div>
);

/** Small thumbs-up icon (an interface glyph, not a hand). */
export const ThumbIcon: React.FC<{size: number}> = ({size}) => (
  <div style={{width: size, height: size, borderRadius: size * 0.28, background: C.amber, display: 'grid', placeItems: 'center', boxShadow: '0 14px 26px -12px rgba(25,43,42,0.55)'}}>
    <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z" fill={C.cream} />
      <path d="M7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.4 7A2 2 0 0 1 17.6 21H7" />
    </svg>
  </div>
);

/** Tiny superhero cape (drawn behind the shoulders). */
export const Cape: React.FC<{w: number; flutter: number}> = ({w, flutter}) => (
  <svg width={w} height={w * 1.25} viewBox="0 0 100 125" style={{overflow: 'visible'}}>
    <path d={`M18 6 Q50 0 82 6 L${92 + flutter * 4} 118 Q50 ${108 + flutter * 6} ${8 - flutter * 4} 118 Z`} fill="#C9603F" stroke="#9A4429" strokeWidth={3} strokeLinejoin="round" />
    <path d="M18 6 Q50 0 82 6" stroke="#F1C9B9" strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------- lesson cards
export const StatementCard: React.FC<{neq: number}> = ({neq}) => (
  <Card3D w={900} h={420} depth={26} radius={44} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6}}>
      <Disp size={70} weight={800}>
        ADDING SERVICE AREAS
      </Disp>
      <div style={{width: 100, height: 100, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center', transform: `scale(${neq}) rotate(${(1 - neq) * -90}deg)`, margin: '6px 0'}}>
        <Disp size={70} weight={800} color={C.cream}>
          ≠
        </Disp>
      </div>
      <Disp size={70} weight={800} color={C.teal}>
        AUTOMATIC RANKINGS
      </Disp>
    </div>
  </Card3D>
);

export const FACTORS: Array<{key: 'relevance' | 'distance' | 'prominence'; title: string; line: string}> = [
  {key: 'relevance', title: 'RELEVANCE', line: 'Your profile matches the search'},
  {key: 'distance', title: 'DISTANCE', line: 'How far you are from the searcher'},
  {key: 'prominence', title: 'PROMINENCE', line: 'How well known your business is'},
];
export const FactorVisual: React.FC<{k: string; p: number}> = ({k, p}) => {
  if (k === 'relevance')
    return (
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        <div style={{padding: '6px 12px', borderRadius: 999, background: C.paper, display: 'flex', gap: 6, alignItems: 'center'}}>
          <Icon name="search" size={20} color={C.muted} />
          <Txt size={20} weight={600}>
            roofer near me
          </Txt>
        </div>
        <div style={{width: 4, height: 26 * p, background: C.teal, borderRadius: 2}} />
        <div style={{padding: '6px 14px', borderRadius: 999, background: C.teal, display: 'flex', gap: 6, alignItems: 'center', opacity: p}}>
          <Icon name="check" size={20} color={C.cream} stroke={3} />
          <Txt size={22} color={C.cream} weight={700}>
            Roofing
          </Txt>
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
        <div key={ic} style={{width: 54, height: 54, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center', transform: `scale(${clamp01(p * 3 - i)})`}}>
          <Icon name={ic} size={30} color={C.cream} />
        </div>
      ))}
    </div>
  );
};
export const FactorFace: React.FC<{i: number; p: number}> = ({i, p}) => {
  const f = FACTORS[i];
  return (
    <Card3D w={860} h={260} depth={20} radius={34} face={C.paper} edge={EDGE.paper} lift={60} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 30, top: 30, width: 220, height: 200, borderRadius: 26, background: C.mintSoft, display: 'grid', placeItems: 'center'}}>
        <FactorVisual k={f.key} p={p} />
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
  );
};

/** Illustrative local search map: one business, two searchers at different distances. */
export const LOCALMAP = {w: 860, h: 640};
export const LocalSearchMap: React.FC<{a: number; b: number; area: number}> = ({a, b, area}) => {
  const biz = {x: 300, y: 330};
  const near = {x: 420, y: 400};
  const far = {x: 730, y: 120};
  const person = (x: number, y: number, p: number, label: string, tone: string) => (
    <g transform={`translate(${x} ${y}) scale(${p})`} opacity={clamp01(p * 2)}>
      <circle r={30} fill={tone} stroke={C.cream} strokeWidth={5} />
      <circle cy={-8} r={9} fill={C.cream} />
      <path d="M-14 16 Q0 -2 14 16 Z" fill={C.cream} />
      <rect x={-62} y={40} width={124} height={34} rx={17} fill={C.paper} />
      <text x={0} y={63} textAnchor="middle" fontFamily="GW Text, Inter, sans-serif" fontWeight={700} fontSize={20} fill={C.charcoal}>
        {label}
      </text>
    </g>
  );
  const line = (to: {x: number; y: number}, p: number) => (
    <path d={`M${biz.x} ${biz.y} L${lerp(biz.x, to.x, p)} ${lerp(biz.y, to.y, p)}`} stroke={C.amber} strokeWidth={5} strokeDasharray="10 10" strokeLinecap="round" />
  );
  return (
    <Card3D w={LOCALMAP.w} h={LOCALMAP.h} depth={24} radius={42} face="#1E3533" edge={EDGE.dark} lift={70} shadowColor="25,43,42">
      <svg width={LOCALMAP.w} height={LOCALMAP.h} viewBox="0 0 860 640" style={{position: 'absolute', inset: 0}}>
        <rect width={860} height={640} fill="#1E3533" />
        {[100, 230, 360, 490].map((y) => (
          <path key={y} d={`M0 ${y} H860`} stroke="rgba(183,216,197,0.16)" strokeWidth={14} />
        ))}
        {[120, 300, 480, 660].map((x) => (
          <path key={x} d={`M${x} 0 V640`} stroke="rgba(183,216,197,0.16)" strokeWidth={14} />
        ))}
        <path d="M0 540 C 200 500, 380 580, 560 530 S 800 480, 860 500" stroke="rgba(23,97,90,0.95)" strokeWidth={40} fill="none" />
        {/* the business's actual service area */}
        <ellipse cx={biz.x} cy={biz.y} rx={250 * area} ry={190 * area} fill="rgba(42,128,119,0.28)" stroke="rgba(183,216,197,0.8)" strokeWidth={4} strokeDasharray="12 10" />
        {line(near, a)}
        {line(far, b)}
        <g transform={`translate(${biz.x} ${biz.y})`}>
          <path d="M0 10 C -18 -10, -26 -24, -26 -38 A26 26 0 1 1 26 -38 C 26 -24, 18 -10, 0 10 Z" fill={C.amber} stroke={C.cream} strokeWidth={5} />
          <circle cy={-38} r={10} fill={C.cream} />
        </g>
        {person(near.x, near.y, a, 'Nearby', C.teal)}
        {person(far.x, far.y, b, 'Far away', '#5C7A74')}
      </svg>
      <div style={{position: 'absolute', left: 26, top: 22, padding: '6px 14px', borderRadius: 999, background: 'rgba(251,250,246,0.92)'}}>
        <Txt size={20} weight={700} style={{letterSpacing: '0.1em'}}>
          EXAMPLE MAP
        </Txt>
      </div>
    </Card3D>
  );
};

export const ServeCard: React.FC = () => (
  <Card3D w={860} h={150} depth={20} radius={34} face={C.teal} edge={EDGE.teal} lift={60} shadowColor="14,72,66">
    <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16}}>
      <Icon name="pin" size={44} color={C.cream} />
      <Disp size={40} weight={800} color={C.cream}>
        SERVICE AREAS = WHERE YOU SERVE
      </Disp>
    </div>
  </Card3D>
);

export const CheckChip: React.FC<{label: string; p: number; icon?: 'roof' | IconName}> = ({label, p, icon = 'check'}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px 14px 16px', borderRadius: 999, background: C.paper, boxShadow: '0 16px 32px -16px rgba(25,43,42,0.45), 0 0 0 2px rgba(25,43,42,0.06)', opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p})`}}>
    <div style={{width: 46, height: 46, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
      {icon === 'roof' ? <RoofGlyph size={28} /> : <Icon name={icon} size={28} color={C.cream} stroke={3} />}
    </div>
    <Disp size={38} weight={700}>
      {label}
    </Disp>
  </div>
);
