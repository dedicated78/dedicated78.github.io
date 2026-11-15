import React from 'react';
import {Img, staticFile} from 'remotion';
import {C} from '../theme';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';
import {Disp, Txt} from './Props';
import {RoofGlyph} from './Ep02Props';
import {FactorVisual} from './Ep03Props';

// Episode 06 props. Both roofing companies, their review counts and every interface here are fictional
// illustrations, not Google or OpenAI screens.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

/** Five-point star (SVG path, centred on 0,0). */
const starPath = (r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(Math.cos(a) * rr).toFixed(2)},${(Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
};
export const Stars: React.FC<{size: number; n?: number; lit?: number; color?: string}> = ({size, n = 5, lit = 1, color = C.amber}) => (
  <svg width={size * n + (n - 1) * size * 0.18} height={size} viewBox={`0 0 ${n * 1.18 - 0.18} 1`} style={{overflow: 'visible'}}>
    {Array.from({length: n}).map((_, i) => (
      <path key={i} d={starPath(0.5)} transform={`translate(${i * 1.18 + 0.5} 0.52)`} fill={clamp01(lit * n - i) > 0.5 ? color : '#E3DDCF'} />
    ))}
  </svg>
);

// ---------------------------------------------------------------- the comparison panel
export const COMPARE = {w: 820, h: 560};
const CompareRow: React.FC<{name: string; count: number; mine?: boolean; shake?: number; show?: number}> = ({name, count, mine, shake = 0, show = 1}) => (
  <div
    style={{
      position: 'relative',
      height: 190,
      borderRadius: 30,
      background: mine ? C.amberSoft : C.ivory,
      border: mine ? `3px solid ${C.amber}` : '3px solid transparent',
      display: 'flex',
      alignItems: 'center',
      padding: '0 30px',
      gap: 22,
      transform: `translateX(${shake}px)`,
      opacity: show,
    }}
  >
    <div style={{width: 92, height: 92, borderRadius: 24, background: mine ? C.amber : C.teal, display: 'grid', placeItems: 'center', flexShrink: 0}}>
      <RoofGlyph size={54} />
    </div>
    <div style={{flex: 1, minWidth: 0}}>
      <Txt size={28} weight={800} style={{letterSpacing: '0.01em', whiteSpace: 'nowrap'}}>
        {name}
      </Txt>
      <div style={{marginTop: 10}}>
        <Stars size={30} />
      </div>
    </div>
    <div style={{textAlign: 'right', flexShrink: 0}}>
      <Disp size={88} weight={800} color={mine ? '#B5792C' : C.teal} style={{lineHeight: 1, fontVariantNumeric: 'tabular-nums'}}>
        {Math.round(count)}
      </Disp>
      <Txt size={22} weight={700} color={C.muted} style={{letterSpacing: '0.06em'}}>
        GOOGLE REVIEWS
      </Txt>
    </div>
  </div>
);
export const ReviewCompare: React.FC<{n100: number; five: number; shake: number; mineShow?: number}> = ({n100, five, shake, mineShow = 1}) => (
  <Card3D w={COMPARE.w} h={COMPARE.h} depth={24} radius={44} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 34, right: 34, top: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <Txt size={26} weight={800} color={C.charcoal} style={{letterSpacing: '0.16em'}}>
        REVIEW COUNT
      </Txt>
      <div style={{padding: '5px 14px', borderRadius: 999, background: C.mintSoft}}>
        <Txt size={18} weight={700} color={C.teal} style={{letterSpacing: '0.12em'}}>
          FICTIONAL EXAMPLE
        </Txt>
      </div>
    </div>
    <div style={{position: 'absolute', left: 30, right: 30, top: 92, display: 'flex', flexDirection: 'column', gap: 22}}>
      <CompareRow name="COMPETITOR ROOFING CO." count={n100} />
      <CompareRow name="MY ROOFING COMPANY" count={5} mine shake={shake} show={clamp01(five * 3) * mineShow} />
    </div>
  </Card3D>
);
/** The "MY ROOFING COMPANY" row as a small portrait, for the memorial frame. */
export const MiniProfile: React.FC<{w: number}> = ({w}) => (
  <div style={{width: w, height: w * 0.78, borderRadius: w * 0.08, background: C.amberSoft, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: w * 0.04}}>
    <div style={{width: w * 0.36, height: w * 0.36, borderRadius: w * 0.09, background: C.amber, display: 'grid', placeItems: 'center'}}>
      <RoofGlyph size={w * 0.22} />
    </div>
    <Stars size={w * 0.1} />
  </div>
);

// ---------------------------------------------------------------- the tiny memorial
/** Plinth + tombstone ("RIP MY GBP", framed mini profile). `stone` fades the tombstone; `office` (0..1)
 * turns the plinth into a warm wooden side table. World units; (0, 0) = plinth top-left. */
export const Memorial: React.FC<{w: number; h: number; stone: number; office: number; t: number}> = ({w, h, stone, office, t}) => {
  const sw = 190;
  const sh = 250;
  const sx = w * 0.55 - sw / 2;
  const top = interpolate3(office, '#D9D6CF', '#C99A68');
  const front = interpolate3(office, '#BDB8AE', '#A9784A');
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h}}>
      {/* tombstone (behind the plinth top edge) */}
      {stone > 0.01 && (
        <div style={{position: 'absolute', left: sx, top: -sh + 14, width: sw, height: sh, opacity: stone, transform: `translateY(${(1 - stone) * 40}px)`}}>
          <div style={{position: 'absolute', inset: 0, borderRadius: `${sw / 2}px ${sw / 2}px 14px 14px`, background: 'linear-gradient(160deg, #E4E2DC 0%, #C9C6BE 60%, #AFAAA0 100%)', boxShadow: 'inset -10px -8px 0 rgba(0,0,0,0.07), 0 18px 30px -14px rgba(25,43,42,0.45)'}} />
          {/* framed mini profile */}
          <div style={{position: 'absolute', left: sw / 2 - 52, top: 28, padding: 6, borderRadius: 12, background: '#B98238', boxShadow: '0 4px 10px rgba(25,43,42,0.25)'}}>
            <MiniProfile w={92} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 128, textAlign: 'center'}}>
            <Disp size={46} weight={800} color="#6E6A62" style={{letterSpacing: '0.06em', lineHeight: 1}}>
              RIP
            </Disp>
            <Disp size={30} weight={800} color="#6E6A62" style={{letterSpacing: '0.08em', lineHeight: 1.3}}>
              MY GBP
            </Disp>
          </div>
        </div>
      )}
      {/* plinth / side table */}
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: 26, borderRadius: 10, background: top, boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.35)'}} />
      <div style={{position: 'absolute', left: 14 + office * 18, top: 22, width: w - 28 - office * 36, height: h - 22, borderRadius: '0 0 12px 12px', background: front, opacity: 1 - office * 0.85}} />
      {office > 0.01 && (
        <>
          {/* table legs */}
          <div style={{position: 'absolute', left: 26, top: 24, width: 18, height: h - 24, borderRadius: 6, background: '#8E6238', opacity: office}} />
          <div style={{position: 'absolute', right: 26, top: 24, width: 18, height: h - 24, borderRadius: 6, background: '#8E6238', opacity: office}} />
          <div style={{position: 'absolute', left: 30, right: 30, top: 26, height: 40, borderRadius: 8, background: '#B5845A', opacity: office}} />
        </>
      )}
      {/* petals scattered on the plinth top (funeral only) */}
      {office < 0.99 && (
        <svg width={w} height={30} style={{position: 'absolute', left: 0, top: -10, overflow: 'visible', opacity: 1 - office}}>
          {[18, 64, 210, 236, 268].map((x, i) => (
            <ellipse key={i} cx={x} cy={12 + (i % 2) * 4} rx={7} ry={4} fill={i % 2 ? '#E3A79A' : '#E08A73'} transform={`rotate(${i * 47 + Math.sin(t * 0.5 + i) * 4} ${x} ${12 + (i % 2) * 4})`} opacity={0.9} />
          ))}
        </svg>
      )}
    </div>
  );
};
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const interpolate3 = (x: number, a: string, b: string) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp01(x)))).join(',')})`;
};

/** Glass vase that appears around the bouquet stems (office decor). Bottom-centre at (0, 0). */
export const Vase: React.FC<{w: number; p: number}> = ({w, p}) => (
  <svg width={w} height={w * 1.1} viewBox="0 0 100 110" style={{overflow: 'visible', opacity: clamp01(p * 2), transform: `scale(${lerp(0.6, 1, p)})`, transformOrigin: '50% 100%'}}>
    <path d="M28,0 L72,0 Q70,10 74,24 Q92,60 80,96 Q76,110 50,110 Q24,110 20,96 Q8,60 26,24 Q30,10 28,0 Z" fill="rgba(183,216,197,0.55)" stroke="rgba(23,97,90,0.55)" strokeWidth={3} />
    <path d="M24,62 Q50,70 76,62 L80,96 Q76,108 50,108 Q24,108 20,96 Z" fill="rgba(42,128,119,0.35)" />
    <path d="M34,30 Q26,60 32,90" stroke="rgba(255,255,255,0.7)" strokeWidth={5} fill="none" strokeLinecap="round" />
  </svg>
);

/** Falling petals across a region (deterministic). */
export const Petals: React.FC<{t: number; o: number; w: number; h: number; n?: number}> = ({t, o, w, h, n = 14}) => {
  if (o <= 0.01) return null;
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: o, pointerEvents: 'none'}}>
      {Array.from({length: n}).map((_, i) => {
        const sp = 0.09 + ((i * 37) % 10) / 160;
        const u = ((t * sp + (i * 0.618) % 1) % 1 + 1) % 1;
        const x = ((i * 173) % w) + Math.sin(t * 1.3 + i) * 30;
        const y = u * h;
        return <ellipse key={i} cx={x} cy={y} rx={8} ry={4.5} fill={i % 3 ? '#E08A73' : '#E3A79A'} opacity={Math.sin(Math.PI * u) * 0.8} transform={`rotate(${t * 90 * (i % 2 ? 1 : -1) + i * 40} ${x} ${y})`} />;
      })}
    </svg>
  );
};

// ---------------------------------------------------------------- relevance / distance / prominence
export const FACTORS6: Array<{key: 'relevance' | 'distance' | 'prominence'; title: string; line: string}> = [
  {key: 'relevance', title: 'RELEVANCE', line: 'How closely a business matches the search'},
  {key: 'distance', title: 'DISTANCE', line: "How far it is from the searcher's location"},
  {key: 'prominence', title: 'PROMINENCE', line: 'How established and well known it is'},
];
export const FACTOR_TILE = {w: 320, h: 400};
export const FactorTile: React.FC<{i: number; p: number}> = ({i, p}) => {
  const f = FACTORS6[i];
  return (
    <Card3D w={FACTOR_TILE.w} h={FACTOR_TILE.h} depth={20} radius={34} face={C.paper} edge={EDGE.paper} lift={60} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 20, right: 20, top: 20, height: 190, borderRadius: 24, background: C.mintSoft, display: 'grid', placeItems: 'center'}}>
        <div style={{transform: 'scale(0.95)'}}>
          <FactorVisual k={f.key} p={p} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 22, right: 22, top: 226, textAlign: 'center'}}>
        <Disp size={40} weight={800} color={C.charcoal}>
          {f.title}
        </Disp>
        <Txt size={24} color={C.muted} weight={600} style={{marginTop: 10, lineHeight: 1.25, whiteSpace: 'normal'}}>
          {f.line}
        </Txt>
      </div>
    </Card3D>
  );
};

// ---------------------------------------------------------------- lesson cards
export const LESSON = {w: 900, h: 440};
export const ReviewsCard: React.FC<{p: number; alone: number}> = ({p, alone}) => (
  <Card3D w={LESSON.w} h={LESSON.h} depth={26} radius={44} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 0, right: 0, top: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16}}>
      <Stars size={58} lit={p} />
      <Disp size={58} weight={800}>
        REVIEWS &amp; RATINGS <span style={{color: C.teal}}>MATTER</span>
      </Disp>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '8px 20px', borderRadius: 999, background: C.mintSoft, opacity: p}}>
        <Icon name="spark" size={28} color={C.teal} />
        <Txt size={28} weight={700} color={C.teal}>
          They can help prominence
        </Txt>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, opacity: clamp01(alone * 2), transform: `scale(${lerp(0.85, 1, alone)})`}}>
        <Disp size={40} weight={800} color={C.charcoal}>
          Review count alone
        </Disp>
        <div style={{width: 64, height: 64, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center'}}>
          <Disp size={46} weight={800} color={C.cream}>
            ≠
          </Disp>
        </div>
        <Disp size={40} weight={800} color={C.teal}>
          the ranking
        </Disp>
      </div>
    </div>
  </Card3D>
);
export const TIPS: Array<{label: string; icon: IconName | 'roof'}> = [
  {label: 'Accurate Business Profile', icon: 'check'},
  {label: 'Relevant Categories', icon: 'list'},
  {label: 'Genuine Customer Reviews', icon: 'chat'},
];

// ---------------------------------------------------------------- quick SEO news
export const NewsPill: React.FC<{p: number}> = ({p}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, padding: '12px 26px 12px 14px', borderRadius: 999, background: C.charcoal, boxShadow: '0 18px 36px -14px rgba(25,43,42,0.6)', opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 30}px) scale(${lerp(0.7, 1, p)})`}}>
    <div style={{width: 40, height: 40, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center'}}>
      <Icon name="spark" size={24} color={C.cream} stroke={2.6} />
    </div>
    <Disp size={36} weight={800} color={C.cream} style={{letterSpacing: '0.06em'}}>
      QUICK SEO NEWS
    </Disp>
  </div>
);
export const NEWS = {w: 860, h: 640};
/** Information card in GrowwithMH style (not an OpenAI interface): date, title, beta, the three steps,
 * and the accuracy notes. */
export const NewsPanel: React.FC<{date: number; title: number; beta: number; steps: number[]; notes: number}> = ({date, title, beta, steps, notes}) => (
  <Card3D w={NEWS.w} h={NEWS.h} depth={24} radius={44} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 40, top: 36, display: 'flex', alignItems: 'center', gap: 12, opacity: clamp01(date * 2), transform: `translateX(${(1 - date) * -30}px)`}}>
      <div style={{padding: '8px 18px', borderRadius: 999, background: C.amberSoft}}>
        <Txt size={26} weight={800} color="#9A6526" style={{letterSpacing: '0.1em'}}>
          NOVEMBER 10, 2026
        </Txt>
      </div>
      <Txt size={22} weight={700} color={C.muted} style={{letterSpacing: '0.08em'}}>
        ANNOUNCED BY OPENAI
      </Txt>
    </div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 112, opacity: clamp01(title * 2), transform: `translateY(${(1 - title) * 24}px)`}}>
      <Disp size={66} weight={800} style={{lineHeight: 1.05}}>
        BUSINESSES IN <span style={{color: C.teal}}>CHATGPT</span>
      </Disp>
    </div>
    <div style={{position: 'absolute', left: 40, top: 200, display: 'flex', alignItems: 'center', gap: 14, opacity: clamp01(beta * 2), transform: `scale(${lerp(0.8, 1, beta)})`, transformOrigin: '0 50%'}}>
      <Disp size={38} weight={800} color={C.charcoal}>
        BUSINESS HUB
      </Disp>
      <Disp size={38} weight={800} color={C.muted}>
        —
      </Disp>
      <div style={{padding: '4px 16px', borderRadius: 12, background: C.teal}}>
        <Disp size={34} weight={800} color={C.cream} style={{letterSpacing: '0.08em'}}>
          BETA
        </Disp>
      </div>
    </div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 290, display: 'flex', gap: 18}}>
      {(['CLAIM', 'VERIFY', 'UPDATE'] as const).map((s, i) => (
        <div key={s} style={{flex: 1, height: 150, borderRadius: 28, background: i === 0 ? C.mintSoft : C.ivory, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: clamp01(steps[i] * 2), transform: `translateY(${(1 - steps[i]) * 26}px)`}}>
          <div style={{width: 54, height: 54, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
            <Icon name={(['key', 'check', 'page'] as IconName[])[i]} size={30} color={C.cream} stroke={2.6} />
          </div>
          <Disp size={32} weight={800} style={{letterSpacing: '0.06em'}}>
            {s}
          </Disp>
        </div>
      ))}
    </div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 466, display: 'flex', flexDirection: 'column', gap: 8, opacity: notes}}>
      {['Eligibility and available features vary', 'Claiming does not guarantee visibility or recommendations', 'Separate from Google Business Profile'].map((n) => (
        <div key={n} style={{display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 10, height: 10, borderRadius: '50%', background: C.amber}} />
          <Txt size={24} weight={600} color={C.charcoalSoft}>
            {n}
          </Txt>
        </div>
      ))}
    </div>
  </Card3D>
);

// ---------------------------------------------------------------- guest cameo (silent)
/** The supplied ChatGPT logo, unaltered, with simple stick arms and legs. Viewbox 300 x 420: the logo
 * disc spans y 0…200, hips at y 196, feet at y 410. `walk` is a phase (radians); `stride` 0…1;
 * `wave` 0…1 raises the screen-left arm; `waveT` drives the gentle wave. */
export const GptGuest: React.FC<{w: number; walk: number; stride: number; wave: number; waveT: number; turn?: number}> = ({w, walk, stride, wave, waveT, turn = 0}) => {
  const k = w / 300;
  const leg = (side: number) => {
    const a = Math.sin(walk + (side > 0 ? Math.PI : 0)) * 12 * stride;
    const hip = {x: 150 + side * 34, y: 196};
    const knee = {x: hip.x + Math.sin((a * Math.PI) / 180) * 104, y: hip.y + Math.cos((a * Math.PI) / 180) * 104};
    const lift = Math.max(0, Math.sin(walk + (side > 0 ? Math.PI : 0))) * 14 * stride;
    const foot = {x: knee.x + Math.sin(((a * 0.4) * Math.PI) / 180) * 100, y: Math.min(410, knee.y + 100) - lift};
    return (
      <g key={side}>
        <path d={`M${hip.x},${hip.y} L${knee.x},${knee.y} L${foot.x},${foot.y}`} stroke="#1B1B1B" strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <ellipse cx={foot.x + side * 8} cy={foot.y + 2} rx={16} ry={8} fill="#1B1B1B" />
      </g>
    );
  };
  // arms hang from the disc's sides; the waving arm lifts at the shoulder, the forearm sways gently
  const swing = Math.sin(walk) * 16 * stride;
  const sh = {x: 54, y: 128};
  const up = wave;
  const a1 = lerp(18 + swing, 150, up); // deg from straight down, toward the outside (screen-left)
  const el = {x: sh.x - Math.sin((a1 * Math.PI) / 180) * 70, y: sh.y + Math.cos((a1 * Math.PI) / 180) * 70};
  const a2 = a1 + lerp(10, 25 + Math.sin(waveT * 9) * 22, up);
  const hand = {x: el.x - Math.sin((a2 * Math.PI) / 180) * 62, y: el.y + Math.cos((a2 * Math.PI) / 180) * 62};
  const shR = {x: 246, y: 128};
  const b1 = 18 - swing;
  const elR = {x: shR.x + Math.sin((b1 * Math.PI) / 180) * 70, y: shR.y + Math.cos((b1 * Math.PI) / 180) * 70};
  const handR = {x: elR.x + Math.sin(((b1 + 10) * Math.PI) / 180) * 62, y: elR.y + Math.cos(((b1 + 10) * Math.PI) / 180) * 62};
  return (
    <svg width={w} height={420 * k} viewBox="0 0 300 420" style={{overflow: 'visible'}}>
      {leg(-1)}
      {leg(1)}
      <path d={`M${shR.x},${shR.y} L${elR.x},${elR.y} L${handR.x},${handR.y}`} stroke="#1B1B1B" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={handR.x} cy={handR.y} r={11} fill="#1B1B1B" />
      {/* the logo itself, unaltered (a white disc behind it keeps it legible on the set) */}
      <g transform={`translate(150 100) scale(${Math.max(0.2, 1 - turn * 0.35)} 1) translate(-150 -100)`}>
        <circle cx={150} cy={100} r={106} fill="#FFFFFF" stroke="rgba(25,43,42,0.12)" strokeWidth={3} />
        <foreignObject x={62} y={12} width={176} height={176}>
          <Img src={staticFile('brand/chatgpt-logo.png')} style={{width: 176, height: 176, display: 'block'}} />
        </foreignObject>
      </g>
      <path d={`M${sh.x},${sh.y} L${el.x},${el.y} L${hand.x},${hand.y}`} stroke="#1B1B1B" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={hand.x} cy={hand.y} r={11} fill="#1B1B1B" />
    </svg>
  );
};
