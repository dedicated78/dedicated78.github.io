import React from 'react';
import {Img, staticFile} from 'remotion';
import {C} from '../theme';
import {lerp} from '../timing';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';
import {Disp, Txt} from './Props';

// Episode 02 props. The business is fictional ("Example Roofing Co."); every on-screen
// detail is illustrative and carries no ratings, rankings or client results.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Simple roof glyph (house outline with a ridge), drawn for this film. */
export const RoofGlyph: React.FC<{size: number; color?: string; stroke?: number}> = ({size, color = C.cream, stroke = 2.4}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 11.5 L12 4 L21.5 11.5" />
    <path d="M5.5 9.5 V20 H18.5 V9.5" />
    <path d="M10 20 V14.5 H14 V20" />
  </svg>
);

// ---------------------------------------------------------------- business header (shared)
const BizHeader: React.FC<{sub: React.ReactNode; size?: number}> = ({sub, size = 1}) => (
  <div style={{display: 'flex', gap: 22 * size, alignItems: 'center'}}>
    <div style={{width: 96 * size, height: 96 * size, borderRadius: 26 * size, background: C.teal, display: 'grid', placeItems: 'center', boxShadow: '8px 14px 24px -10px rgba(25,43,42,0.45)'}}>
      <RoofGlyph size={56 * size} />
    </div>
    <div>
      <Disp size={46 * size}>Example Roofing Co.</Disp>
      <div style={{marginTop: 8 * size}}>{sub}</div>
    </div>
  </div>
);

// ---------------------------------------------------------------- hours card
export const HOURS = {w: 760, h: 640};
const HOUR_ROWS: Array<[string, string]> = [
  ['Mon – Fri', '7 AM – 5 PM'],
  ['Saturday', '8 AM – 12 PM'],
  ['Sunday', 'OPEN'],
];
export const HoursCard: React.FC<{t: number; sunday: number; sepia?: number; ry?: number}> = ({t, sunday, sepia = 0, ry = 0}) => {
  const pulse = sunday > 0.99 ? 0.5 + 0.5 * Math.sin(t * 7) : 0;
  return (
    <Card3D w={HOURS.w} h={HOURS.h} depth={22} radius={38} face={C.paper} edge={EDGE.paper} ry={ry} lift={70} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 40, top: 40}}>
        <BizHeader
          sub={
            <Txt size={26} color={C.muted} weight={500}>
              Business Profile · example
            </Txt>
          }
        />
      </div>
      <div style={{position: 'absolute', left: 40, right: 40, top: 176, height: 2, background: C.creamLine}} />
      <div style={{position: 'absolute', left: 40, right: 40, top: 204, display: 'flex', alignItems: 'center', gap: 14}}>
        <Icon name="clock" size={34} color={C.teal} />
        <Txt size={32} weight={700}>
          Hours
        </Txt>
      </div>
      <div style={{position: 'absolute', left: 40, right: 40, top: 268, display: 'flex', flexDirection: 'column', gap: 14}}>
        {HOUR_ROWS.map(([d, h], i) => {
          const sun = i === 2;
          const hi = sun ? sunday : 0;
          return (
            <div
              key={d}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 88,
                padding: '0 28px',
                borderRadius: 22,
                background: sun ? `rgba(211,155,79,${0.12 + 0.2 * hi})` : C.ivory,
                boxShadow: sun ? `0 0 0 ${3 + 3 * pulse}px rgba(211,155,79,${0.6 * hi})` : undefined,
                transform: `scale(${1 + 0.04 * hi})`,
              }}
            >
              <Txt size={34} weight={600} color={C.charcoal}>
                {d}
              </Txt>
              {sun ? (
                <div style={{padding: '8px 22px', borderRadius: 999, background: lerp(0, 1, hi) > 0.5 ? C.amber : C.mintSoft, display: 'flex', alignItems: 'center', gap: 10}}>
                  <div style={{width: 14, height: 14, borderRadius: '50%', background: hi > 0.5 ? C.cream : C.teal}} />
                  <Disp size={32} weight={800} color={hi > 0.5 ? C.cream : C.teal} style={{letterSpacing: '0.06em'}}>
                    {h}
                  </Disp>
                </div>
              ) : (
                <Txt size={32} weight={600} color={C.muted}>
                  {h}
                </Txt>
              )}
            </div>
          );
        })}
      </div>
      {/* old-film treatment for the "historical documentary" line */}
      {sepia > 0 && (
        <>
          <div style={{position: 'absolute', inset: 0, background: `rgba(150,108,52,${0.28 * sepia})`, mixBlendMode: 'multiply'}} />
          <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(60,40,15,${0.45 * sepia}) 100%)`}} />
          {[0.17, 0.43, 0.71].map((x, i) => (
            <div key={i} style={{position: 'absolute', top: 0, bottom: 0, left: `${(x * 100 + Math.sin(t * 9 + i * 2) * 6).toFixed(2)}%`, width: 2, background: `rgba(60,40,15,${0.35 * sepia * (0.5 + 0.5 * Math.sin(t * 23 + i))})`}} />
          ))}
          <div style={{position: 'absolute', inset: 0, background: `rgba(255,240,210,${0.08 * sepia * (0.5 + 0.5 * Math.sin(t * 31))})`}} />
        </>
      )}
    </Card3D>
  );
};

// ---------------------------------------------------------------- calendar: spins to SUNDAY, then pages flip back through the years
const CAL_PAGES = [
  {head: 'SUNDAY', big: 'SUN', small: 'Today'},
  {head: 'SUNDAY', big: '2025', small: 'Profile hours'},
  {head: 'SUNDAY', big: '2024', small: 'Profile hours'},
  {head: 'SUNDAY', big: '2023', small: 'Profile hours'},
  {head: 'SUNDAY', big: '2022', small: 'Profile hours'},
];
/** `back` 0..4: how many pages have dropped down over SUN (flipping back in time). */
export const YearCalendar: React.FC<{w: number; back: number; sepia?: number}> = ({w, back, sepia = 0}) => {
  const h = w * 1.08;
  const face = (k: number) => {
    const pg = CAL_PAGES[k];
    return (
      <div style={{position: 'absolute', inset: 0, borderRadius: w * 0.07, background: C.paper, overflow: 'hidden', boxShadow: 'inset 0 -3px 0 rgba(25,43,42,0.06)'}}>
        <div style={{height: h * 0.25, background: C.amber, display: 'grid', placeItems: 'center'}}>
          <Disp size={w * 0.12} color={C.cream} weight={800} style={{letterSpacing: '0.1em'}}>
            {pg.head}
          </Disp>
        </div>
        <div style={{position: 'absolute', top: h * 0.32, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: h * 0.03}}>
          <Disp size={w * 0.27} weight={800} color={C.charcoal}>
            {pg.big}
          </Disp>
          <Txt size={w * 0.075} color={C.muted} weight={600}>
            {pg.small}
          </Txt>
        </div>
        {sepia > 0 && <div style={{position: 'absolute', inset: 0, background: `rgba(150,108,52,${0.3 * sepia})`, mixBlendMode: 'multiply'}} />}
      </div>
    );
  };
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d'}}>
      <div style={{position: 'absolute', left: -w * 0.04, right: -w * 0.04, top: -h * 0.06, height: h * 0.1, borderRadius: w * 0.04, background: C.charcoal, transform: 'translateZ(-30px)'}} />
      {Array.from({length: 6}).map((_, i) => (
        <div key={`e${i}`} style={{position: 'absolute', inset: 0, borderRadius: w * 0.07, background: i % 2 ? '#E4DFD3' : '#EDE9DF', transform: `translateZ(${-2 - i * 2}px)`}} />
      ))}
      {CAL_PAGES.map((_, k) => {
        // page 0 lies flat; page k (k ≥ 1) swings down over it once back passes k-1
        const f = k === 0 ? 1 : clamp01(back - (k - 1));
        if (f <= 0) return null;
        return (
          <div key={k} style={{position: 'absolute', inset: 0, transformOrigin: '50% 0%', transform: `translateZ(${k * 1.5}px) rotateX(${(1 - f) * -165}deg)`, backfaceVisibility: 'hidden'}}>
            {face(k)}
          </div>
        );
      })}
      {[0.28, 0.72].map((x) => (
        <div key={x} style={{position: 'absolute', left: w * x - 10, top: -h * 0.08, width: 20, height: h * 0.13, borderRadius: 10, background: '#8C9692', transform: 'translateZ(12px)'}} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- vintage film reel (brief, for the "documentary" joke)
export const FilmReel: React.FC<{w: number; t: number}> = ({w, t}) => {
  const spin = (t * 220) % 360;
  const reel = (cx: number, cy: number, r: number) => (
    <g transform={`rotate(${spin} ${cx} ${cy})`}>
      <circle cx={cx} cy={cy} r={r} fill="#3A3027" />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="#5B4B3A" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <circle key={a} cx={cx + Math.cos((a * Math.PI) / 180) * r * 0.5} cy={cy + Math.sin((a * Math.PI) / 180) * r * 0.5} r={r * 0.17} fill="#2A231C" />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.14} fill="#C9B48F" />
    </g>
  );
  const shift = (t * 260) % 64;
  return (
    <svg width={w} height={w * 0.62} viewBox="0 0 500 310" style={{overflow: 'visible'}}>
      {reel(130, 110, 100)}
      {reel(370, 110, 100)}
      {/* film strip running under the reels */}
      <g>
        <rect x={-40} y={226} width={580} height={70} rx={6} fill="#2A231C" />
        {Array.from({length: 11}).map((_, i) => (
          <g key={i} transform={`translate(${i * 64 - shift - 40} 0)`}>
            <rect x={8} y={232} width={10} height={8} rx={2} fill="#C9B48F" />
            <rect x={8} y={282} width={10} height={8} rx={2} fill="#C9B48F" />
            <rect x={24} y={244} width={34} height={34} rx={3} fill="#D8C3A0" />
            <rect x={29} y={252} width={24} height={6} rx={2} fill="#8A6A3C" />
            <rect x={29} y={263} width={16} height={6} rx={2} fill="#B08B55" />
          </g>
        ))}
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- category card with illustrative roofing jobs
export const CATEGORY = {w: 740, h: 700};
const RoofJob: React.FC<{k: number; size: number}> = ({k, size}) => (
  <svg width={size} height={size * 0.78} viewBox="0 0 180 140" style={{display: 'block', borderRadius: 20, overflow: 'hidden'}}>
    <rect width={180} height={140} fill={['#DDEDE3', '#F3E3C8', '#E4EEF0'][k]} />
    <rect x={0} y={112} width={180} height={28} fill="#CFE0D5" />
    {/* house */}
    <rect x={42} y={70} width={96} height={48} fill="#FFFFFF" />
    <rect x={80} y={88} width={20} height={30} fill="#C9D6CF" />
    <path d="M30 74 L90 30 L150 74 Z" fill={C.teal} />
    {/* shingle lines */}
    {[46, 58].map((y) => (
      <path key={y} d={`M${30 + (y - 30) * 1.36 * 0.5} ${y} H${150 - (y - 30) * 1.36 * 0.5}`} stroke="rgba(255,255,255,0.35)" strokeWidth={3} />
    ))}
    {/* the repair highlight differs per job */}
    {k === 0 && <rect x={98} y={44} width={22} height={16} rx={3} fill={C.amber} stroke={C.cream} strokeWidth={3} transform="rotate(-36 109 52)" />}
    {k === 1 && <path d="M58 46 L90 30 L122 46" stroke={C.amber} strokeWidth={8} fill="none" strokeLinecap="round" />}
    {k === 2 && <path d="M28 76 H152" stroke={C.amber} strokeWidth={8} strokeLinecap="round" />}
  </svg>
);
export const CategoryCard: React.FC<{hi: number; doubt: number; jobs: number[]; suggest: number}> = ({hi, doubt, jobs, suggest}) => (
  <Card3D w={CATEGORY.w} h={CATEGORY.h} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 40, top: 40}}>
      <BizHeader
        size={0.85}
        sub={
          <Txt size={24} color={C.muted} weight={500}>
            Business Profile · example
          </Txt>
        }
      />
    </div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 160, height: 2, background: C.creamLine}} />
    <Txt size={26} color={C.muted} weight={600} style={{position: 'absolute', left: 40, top: 186, letterSpacing: '0.08em'}}>
      PRIMARY CATEGORY
    </Txt>
    <div style={{position: 'absolute', left: 40, top: 232, display: 'flex', alignItems: 'center', gap: 18}}>
      <div
        style={{
          padding: '14px 28px',
          borderRadius: 999,
          background: `rgba(23,97,90,${0.08 + 0.1 * hi})`,
          border: `3px ${doubt > 0.5 ? 'dashed' : 'solid'} rgba(${doubt > 0.5 ? '211,155,79' : '23,97,90'},${0.25 + 0.6 * Math.max(hi, doubt)})`,
          transform: `scale(${1 + 0.05 * hi * (1 - doubt)})`,
        }}
      >
        <Disp size={44} weight={700} color={C.charcoal}>
          General Contractor
        </Disp>
      </div>
      {doubt > 0.01 && (
        <div style={{width: 54, height: 54, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center', transform: `scale(${doubt})`}}>
          <Disp size={36} weight={800} color={C.cream}>
            ?
          </Disp>
        </div>
      )}
    </div>
    <div style={{position: 'absolute', left: 40, top: 352, display: 'flex', alignItems: 'baseline', gap: 12}}>
      <Txt size={26} color={C.muted} weight={600} style={{letterSpacing: '0.08em'}}>
        RECENT JOBS
      </Txt>
      <Txt size={22} color={C.muted} weight={500}>
        (illustrative)
      </Txt>
    </div>
    <div style={{position: 'absolute', left: 40, right: 40, top: 398, display: 'flex', gap: 18}}>
      {['Roof repair', 'Ridge repair', 'Leak fix'].map((l, k) => {
        const p = jobs[k] ?? 0;
        return (
          <div key={l} style={{flex: 1, opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 30}px) scale(${0.85 + 0.15 * p})`}}>
            <RoofJob k={k} size={208} />
            <Txt size={24} weight={600} style={{marginTop: 10, textAlign: 'center'}}>
              {l}
            </Txt>
          </div>
        );
      })}
    </div>
    {suggest > 0.01 && (
      <div style={{position: 'absolute', right: 34, top: 176, padding: '10px 20px', borderRadius: 999, background: C.teal, display: 'flex', alignItems: 'center', gap: 10, opacity: clamp01(suggest * 2), transform: `translateY(${(1 - suggest) * -16}px) scale(${0.8 + 0.2 * suggest})`, boxShadow: '0 12px 24px -12px rgba(14,72,66,0.6)'}}>
        <RoofGlyph size={30} />
        <Txt size={26} color={C.cream} weight={700}>
          Roofing contractor?
        </Txt>
      </div>
    )}
  </Card3D>
);

// ---------------------------------------------------------------- paperwork stack ("unpaid office manager")
export const Paperwork: React.FC<{w: number; spread?: number}> = ({w, spread = 0}) => {
  const h = w * 0.66;
  return (
    <div style={{position: 'relative', width: w, height: h + 30}}>
      {[5, 4, 3, 2, 1, 0].map((i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: Math.sin(i * 2.3) * 6 * (1 + spread),
            top: 30 - i * 5,
            width: w,
            height: h,
            borderRadius: 10,
            background: i % 2 ? '#F4F1EA' : '#FFFFFF',
            boxShadow: '0 2px 0 rgba(25,43,42,0.10), 0 10px 18px -12px rgba(25,43,42,0.4)',
            transform: `rotate(${Math.sin(i * 1.7) * 3 * (1 + spread)}deg)`,
          }}
        >
          {i === 0 && (
            <div style={{position: 'absolute', inset: w * 0.07}}>
              <Txt size={w * 0.085} weight={700}>
                Profile updates
              </Txt>
              {[0.8, 0.65, 0.72].map((x, k) => (
                <div key={k} style={{display: 'flex', alignItems: 'center', gap: w * 0.03, marginTop: w * 0.045}}>
                  <div style={{width: w * 0.06, height: w * 0.06, borderRadius: w * 0.012, border: `2px solid ${C.teal}`}} />
                  <div style={{width: w * x * 0.75, height: w * 0.03, borderRadius: w * 0.015, background: C.hair}} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {/* binder clip */}
      <div style={{position: 'absolute', left: w * 0.42, top: 0, width: w * 0.16, height: w * 0.09, borderRadius: 6, background: C.charcoal}} />
    </div>
  );
};

// ---------------------------------------------------------------- educational cards
export type InfoKey = 'category' | 'hours' | 'services' | 'contact';
export const INFO: Record<InfoKey, {title: string; icon: IconName | 'roof'; rows: string[]}> = {
  category: {title: 'Business Category', icon: 'roof', rows: ['Roofing contractor', 'Matches your main work']},
  hours: {title: 'Opening Hours', icon: 'clock', rows: ['Mon – Fri  7 AM – 5 PM', 'Sunday  Closed']},
  services: {title: 'Services', icon: 'list', rows: ['Roof repair · Leak repair', 'Inspections']},
  contact: {title: 'Contact Details', icon: 'phone', rows: ['Phone · Website', 'Service area']},
};
export const INFO_CARD = {w: 470, h: 300};
export const InfoCard: React.FC<{k: InfoKey; n: number; check?: number}> = ({k, n, check = 0}) => {
  const d = INFO[k];
  return (
    <Card3D w={INFO_CARD.w} h={INFO_CARD.h} depth={18} radius={32} face={C.paper} edge={EDGE.paper} lift={50} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 30, top: 30, display: 'flex', alignItems: 'center', gap: 18}}>
        <div style={{width: 74, height: 74, borderRadius: 22, background: C.mintSoft, display: 'grid', placeItems: 'center'}}>
          {d.icon === 'roof' ? <RoofGlyph size={42} color={C.teal} /> : <Icon name={d.icon} size={40} color={C.teal} />}
        </div>
        <Disp size={36} weight={800}>
          {d.title}
        </Disp>
      </div>
      <div style={{position: 'absolute', right: 26, top: 26, width: 44, height: 44, borderRadius: '50%', border: `3px solid ${C.teal}`, background: check > 0.5 ? C.teal : 'transparent', display: 'grid', placeItems: 'center'}}>
        {check > 0.5 ? (
          <Icon name="check" size={26} color={C.cream} stroke={3.4} />
        ) : (
          <Disp size={22} color={C.teal} weight={800}>
            {n}
          </Disp>
        )}
      </div>
      <div style={{position: 'absolute', left: 30, right: 30, top: 136, display: 'flex', flexDirection: 'column', gap: 12}}>
        {d.rows.map((r, i) => (
          <div key={r} style={{height: 56, borderRadius: 16, background: i ? C.ivory : 'rgba(183,216,197,0.35)', display: 'flex', alignItems: 'center', padding: '0 18px'}}>
            <Txt size={27} weight={600} color={i ? C.muted : C.charcoal}>
              {r}
            </Txt>
          </div>
        ))}
      </div>
    </Card3D>
  );
};

/** What a customer sees when the profile is accurate (illustrative). */
export const CUSTOMER = {w: 640, h: 520};
export const CustomerView: React.FC<{p: number; know: number}> = ({p, know}) => (
  <Card3D w={CUSTOMER.w} h={CUSTOMER.h} depth={20} radius={36} face={C.paper} edge={EDGE.paper} lift={60} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 36, right: 36, top: 32, height: 74, borderRadius: 37, background: C.ivory, display: 'flex', alignItems: 'center', gap: 14, padding: '0 24px'}}>
      <Icon name="search" size={32} color={C.teal} />
      <Txt size={28} weight={600}>
        roof repair near me
      </Txt>
    </div>
    <div style={{position: 'absolute', left: 36, right: 36, top: 132}}>
      <BizHeader
        size={0.72}
        sub={
          <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
            <div style={{width: 12, height: 12, borderRadius: '50%', background: C.amber}} />
            <Txt size={24} weight={600} color={C.charcoal}>
              Closed · Opens Mon 7 AM
            </Txt>
          </div>
        }
      />
    </div>
    <div style={{position: 'absolute', left: 36, right: 36, top: 262, display: 'flex', gap: 14, opacity: clamp01(p * 2)}}>
      {(
        [
          ['phone', 'Call'],
          ['directions', 'Directions'],
          ['globe', 'Website'],
        ] as Array<[IconName, string]>
      ).map(([ic, l], i) => (
        <div key={l} style={{flex: 1, height: 64, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: i === 0 ? C.teal : C.ivory}}>
          <Icon name={ic} size={26} color={i === 0 ? C.cream : C.teal} />
          <Txt size={26} weight={600} color={i === 0 ? C.cream : C.charcoal}>
            {l}
          </Txt>
        </div>
      ))}
    </div>
    <div style={{position: 'absolute', left: 36, right: 36, bottom: 36, height: 96, borderRadius: 24, background: `rgba(183,216,197,${0.5 * know})`, display: 'flex', alignItems: 'center', gap: 18, padding: '0 24px', opacity: clamp01(know * 2), transform: `translateY(${(1 - know) * 20}px)`}}>
      <div style={{width: 52, height: 52, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
        <Icon name="check" size={30} color={C.cream} stroke={3.2} />
      </div>
      <Txt size={30} weight={700}>
        The customer knows when to call
      </Txt>
    </div>
  </Card3D>
);

/** Honest footnote for rankings: accuracy is not a ranking guarantee. */
export const RankNote: React.FC<{p: number; strike: number}> = ({p, strike}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px', borderRadius: 999, background: C.paper, boxShadow: '0 16px 32px -16px rgba(25,43,42,0.45), 0 0 0 2px rgba(25,43,42,0.06)', opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 24}px) scale(${0.9 + 0.1 * p})`}}>
    <div style={{position: 'relative'}}>
      <Disp size={50} weight={800} color={C.charcoal}>
        Automatic top rankings
      </Disp>
      <div style={{position: 'absolute', left: -4, top: '52%', height: 6, width: `${(strike * 104).toFixed(1)}%`, background: C.amber, borderRadius: 3}} />
    </div>
    <div style={{padding: '6px 16px', borderRadius: 999, background: C.amberSoft, opacity: clamp01(strike * 2)}}>
      <Txt size={32} weight={700} color="#8A5F22">
        Not guaranteed
      </Txt>
    </div>
  </div>
);

// ---------------------------------------------------------------- supplied GrowwithMH logo as a dimensional tile
export const LogoTile: React.FC<{size: number; ry?: number}> = ({size, ry = 0}) => (
  <Card3D w={size} h={size} depth={26} radius={size * 0.22} face="#000C26" edge={['#1B2A48', '#0C1630', '#050A18']} ry={ry} lift={60} shadowColor="25,43,42" gloss={0.6}>
    <Img src={staticFile('brand/growwithmh-logo.jpg')} style={{width: '100%', height: '100%', display: 'block'}} />
  </Card3D>
);
