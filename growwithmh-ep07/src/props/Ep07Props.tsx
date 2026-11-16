import React from 'react';
import {C, FONT_DISPLAY} from '../theme';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';
import {Disp, Txt} from './Props';
import {RoofGlyph} from './Ep02Props';

// Episode 07 props. Apex Roofing, its keywords, the profile card, the warnings, the result cards and the
// website are fictional illustrations, not Google screens or Google system messages.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;

// ---------------------------------------------------------------- the name, phrase by phrase
export const NAME = 'Apex Roofing';
export const PHRASES = ['Best Brooklyn Roofer', 'Emergency Roof Repairs', '24/7', 'Cheap', '#1'];
/** 38 more words that pour out as a ribbon (9 + 38 = the "other forty-seven words"). */
export const EXTRA = [
  'Roof Replacement', 'Leak Repair', 'Gutter Cleaning', 'Near Me', 'Free Estimates', 'Top Rated', 'Licensed Insured', 'Queens', 'Manhattan', 'Bronx', 'Staten Island',
  'Same Day Service', 'Affordable', 'Shingle Experts', 'Flat Roof Pros', 'Storm Damage', 'Skylights', 'Chimney Repair', 'Low Prices', 'Family Owned', 'Trusted',
];
export const wordCount = (s: string[]) => s.reduce((n, p) => n + p.split(/\s+/).length, 0);
export const RIBBON_TEXT = ` • ${EXTRA.join(' • ')}`;

// ---------------------------------------------------------------- profile card (fictional, GBP-inspired)
export const PROFILE7 = {w: 820, h: 430};
/** `shown` = how many of the five phrases are in the field; `typing` (0..1) types the newest one.
 * `clean` (0..1) restores the field to "Apex Roofing" with a check. */
export const ProfileCard7: React.FC<{shown: number; typing: number; hi: number; strain: number; t: number; clean?: number; overflowOut?: number}> = ({shown, typing, hi, strain, t, clean = 0, overflowOut = 0}) => {
  const n = Math.floor(shown);
  const parts = [NAME, ...PHRASES.slice(0, n)];
  let text = parts.join(' — ');
  if (n < PHRASES.length && typing > 0 && shown > n) {
    const next = PHRASES[n];
    text += ' — ' + next.slice(0, Math.ceil(next.length * clamp01(typing)));
  }
  if (clean > 0.5) text = NAME;
  const chars = text.length;
  // the field fights to contain it: the type shrinks a little, then it wraps and the field swells past the card
  const size = clean > 0.5 ? 64 : Math.max(48, Math.min(64, 64 - (chars - 12) * 0.5));
  const lineChars = Math.floor(850 / (size * 0.56));
  const lines = clean > 0.5 ? 1 : Math.max(1, Math.ceil(chars / lineChars));
  const wob = Math.sin(t * 9) * strain;
  const fieldW = clean > 0.5 ? 680 : lerp(680, 900, clamp01((chars - 14) / 30));
  const fieldH = lines * size * 1.12 + 40;
  return (
    <div style={{position: 'relative', width: PROFILE7.w, height: PROFILE7.h}}>
    <Card3D w={PROFILE7.w} h={PROFILE7.h} depth={24} radius={44} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 36, right: 36, top: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{width: 44, height: 44, borderRadius: 14, background: C.teal, display: 'grid', placeItems: 'center'}}>
            <RoofGlyph size={26} />
          </div>
          <Txt size={24} weight={800} style={{letterSpacing: '0.14em'}}>
            BUSINESS PROFILE
          </Txt>
        </div>
        <div style={{padding: '5px 14px', borderRadius: 999, background: C.mintSoft}}>
          <Txt size={18} weight={700} color={C.teal} style={{letterSpacing: '0.12em'}}>
            ILLUSTRATIVE
          </Txt>
        </div>
      </div>
      <div style={{position: 'absolute', left: 40, top: 110}}>
        <Txt size={20} weight={800} color={C.muted} style={{letterSpacing: '0.16em'}}>
          BUSINESS NAME
        </Txt>
      </div>
      {/* the rest of the card stays calm and readable */}
      <div style={{position: 'absolute', left: 40, right: 40, top: 286, display: 'flex', gap: 16}}>
        {[
          ['CATEGORY', 'Roofing contractor'],
          ['AREA', 'Brooklyn, NY'],
        ].map(([k, v]) => (
          <div key={k} style={{flex: 1, height: 104, borderRadius: 20, background: C.ivory, padding: '16px 20px'}}>
            <Txt size={17} weight={800} color={C.muted} style={{letterSpacing: '0.14em'}}>
              {k}
            </Txt>
            <Txt size={28} weight={700} style={{marginTop: 8}}>
              {v}
            </Txt>
          </div>
        ))}
      </div>
    </Card3D>
      {/* the name field sits on top of the card (outside its clipped face) so it can outgrow the card */}
      <div
        style={{
          position: 'absolute',
          left: 34,
          top: 146,
          width: fieldW,
          height: fieldH,
          borderRadius: 22,
          background: C.ivory,
          boxShadow: `inset 0 0 0 ${3 + 3 * hi}px rgba(23,97,90,${0.15 + 0.75 * hi}), 0 0 ${30 * hi}px rgba(23,97,90,${0.35 * hi}), 0 ${14 * strain}px ${30 * strain}px -12px rgba(25,43,42,${0.45 * strain})`,
          transform: `scale(${1 + wob * 0.015}, ${1 - wob * 0.02}) skewX(${wob * 1.4}deg)`,
          transformOrigin: '0 0',
        }}
      >
        <div style={{position: 'absolute', left: 26, right: 22, top: 20, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 1.12, letterSpacing: '-0.02em', color: C.charcoal, opacity: 1 - overflowOut}}>
          {text}
          {clean < 0.5 && typing > 0 && typing < 1 && <span style={{display: 'inline-block', width: 4, height: size * 0.9, background: C.teal, marginLeft: 4, verticalAlign: 'middle', opacity: Math.sin(t * 20) > 0 ? 1 : 0}} />}
        </div>
        {clean > 0.5 && (
          <div style={{position: 'absolute', right: 22, top: 30, width: 50, height: 50, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center', transform: `scale(${clamp01((clean - 0.5) * 2)})`}}>
            <Icon name="check" size={30} color={C.cream} stroke={3.2} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Running word counter next to the field ("+47 WORDS"). */
export const WordCounter: React.FC<{n: number; p: number}> = ({n, p}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, background: n > 20 ? '#B5792C' : C.amber, boxShadow: '0 12px 24px -10px rgba(25,43,42,0.45)', opacity: clamp01(p * 2), transform: `scale(${lerp(0.6, 1, p)})`}}>
    <Disp size={30} weight={800} color={C.cream} style={{fontVariantNumeric: 'tabular-nums'}}>
      +{n} WORDS
    </Disp>
  </div>
);

/** A floating dimensional map tile (decor the ribbon wraps around). */
export const MapCard: React.FC<{w: number; h: number; seed?: number}> = ({w, h, seed = 0}) => (
  <Card3D w={w} h={h} depth={16} radius={26} face="#1E3533" edge={EDGE.dark} lift={50} shadowColor="25,43,42">
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', inset: 0}}>
      {[0.3, 0.62].map((f) => (
        <path key={f} d={`M0 ${h * f} H${w}`} stroke="rgba(183,216,197,0.18)" strokeWidth={10} />
      ))}
      {[0.28, 0.66].map((f) => (
        <path key={f} d={`M${w * f} 0 V${h}`} stroke="rgba(183,216,197,0.18)" strokeWidth={10} />
      ))}
      <path d={`M0 ${h * 0.85} C ${w * 0.3} ${h * (0.7 + seed * 0.1)}, ${w * 0.6} ${h * 0.95}, ${w} ${h * 0.8}`} stroke="rgba(23,97,90,0.95)" strokeWidth={18} fill="none" />
      {[
        [0.4, 0.42],
        [0.75 - seed * 0.2, 0.3],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${w * x} ${h * y})`}>
          <path d="M0 8 C -11 -4, -15 -13, -15 -22 A15 15 0 1 1 15 -22 C 15 -13, 11 -4, 0 8 Z" fill={i ? C.mint : C.amber} />
          <circle cy={-22} r={5} fill="#1E3533" />
        </g>
      ))}
    </svg>
  </Card3D>
);

// ---------------------------------------------------------------- the ribbon (text on a path)
export type Pt = {x: number; y: number};
/** Catmull-Rom through points → SVG cubic path, plus a sampled polyline for lengths. */
export const smoothPath = (pts: Pt[]) => {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
    const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x},${p2.y}`;
  }
  // length by sampling the cubic segments
  let len = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
    const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
    let prev = p1;
    for (let k = 1; k <= 24; k++) {
      const u = k / 24;
      const a = (1 - u) ** 3;
      const b = 3 * (1 - u) ** 2 * u;
      const c = 3 * (1 - u) * u * u;
      const e = u ** 3;
      const q = {x: a * p1.x + b * c1.x + c * c2.x + e * p2.x, y: a * p1.y + b * c1.y + c * c2.y + e * p2.y};
      len += Math.hypot(q.x - prev.x, q.y - prev.y);
      prev = q;
    }
  }
  return {d, len};
};

/** A soft banner ribbon whose text runs along a path. `reveal` = px of ribbon shown from the start;
 * `crawl` = px the text has drifted along the ribbon (it never ends). */
export const Ribbon: React.FC<{id: string; d: string; reveal: number; crawl: number; text: string; width?: number; size?: number; opacity?: number; clip?: string}> = ({id, d, reveal, crawl, text, width = 66, size = 32, opacity = 1, clip}) => {
  if (reveal <= 1) return null;
  const dash = `${reveal} 100000`;
  const repeated = text.repeat(4);
  const unit = text.length * size * 0.6; // one repetition, roughly, in px: the text flows outward and loops
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity, pointerEvents: 'none'}}>
      <defs>
        <path id={id} d={d} />
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x={-2000} y={-2000} width={6000} height={6000}>
          <use href={`#${id}`} stroke="#fff" strokeWidth={width + 4} strokeDasharray={dash} fill="none" strokeLinecap="round" />
        </mask>
      </defs>
      <g clipPath={clip}>
        <use href={`#${id}`} stroke="rgba(14,72,66,0.18)" strokeWidth={width} strokeDasharray={dash} fill="none" strokeLinecap="round" transform="translate(6 12)" />
        <use href={`#${id}`} stroke={C.paper} strokeWidth={width} strokeDasharray={dash} fill="none" strokeLinecap="round" />
        <use href={`#${id}`} stroke="rgba(23,97,90,0.85)" strokeWidth={4} strokeDasharray={dash} fill="none" transform={`translate(0 ${-width / 2 + 3})`} opacity={0} />
        <g mask={`url(#${id}m)`}>
          <text fontFamily={FONT_DISPLAY} fontWeight={800} fontSize={size} fill={C.teal} letterSpacing="0.01em" dy={size * 0.36}>
            <textPath href={`#${id}`} startOffset={(((crawl % unit) + unit) % unit) - unit}>
              {repeated}
            </textPath>
          </text>
        </g>
      </g>
    </svg>
  );
};

// ---------------------------------------------------------------- "that's an entire search results page"
export const RESULTS = ['Best Brooklyn Roofer', 'Emergency Roof Repairs', '24/7 Roofing', 'Cheap Roofer Near Me', 'Free Estimates Queens', 'Top Rated Gutter Cleaning'];
export const ResultsStack: React.FC<{p: number; t: number}> = ({p, t}) => (
  <div style={{position: 'relative', width: 640}}>
    <div style={{display: 'flex', justifyContent: 'center', marginBottom: 14, opacity: clamp01(p * 3)}}>
      <div style={{padding: '6px 16px', borderRadius: 999, background: C.charcoal}}>
        <Txt size={20} weight={800} color={C.cream} style={{letterSpacing: '0.12em'}}>
          ONE NAME? · FICTIONAL
        </Txt>
      </div>
    </div>
    {RESULTS.map((r, i) => {
      const q = clamp01(p * 7 - i * 0.9);
      return (
        <div key={r} style={{height: 88, marginBottom: 12, borderRadius: 20, background: C.paper, boxShadow: '0 14px 28px -14px rgba(25,43,42,0.45), 0 0 0 2px rgba(25,43,42,0.05)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', opacity: q, transform: `translateY(${(1 - q) * -30}px) rotate(${(i % 2 ? 1 : -1) * (1 - q) * 6 + Math.sin(t * 2 + i) * 0.6}deg)`}}>
          <div style={{width: 48, height: 48, borderRadius: 14, background: C.mintSoft, display: 'grid', placeItems: 'center', flexShrink: 0}}>
            <Icon name="search" size={26} color={C.teal} />
          </div>
          <div style={{flex: 1}}>
            <Txt size={28} weight={800}>
              {r}
            </Txt>
            <div style={{marginTop: 8, display: 'flex', gap: 8}}>
              <div style={{width: 200, height: 9, borderRadius: 5, background: C.hair}} />
              <div style={{width: 120, height: 9, borderRadius: 5, background: C.hair}} />
            </div>
          </div>
        </div>
      );
    })}
  </div>
);

/** Two ribbon bands strapped across the profile card + a knot ("a hostage situation"). Card space. */
export const WrapBands: React.FC<{p: number; w: number; h: number}> = ({p, w, h}) => {
  if (p <= 0.01) return null;
  const band = (rot: number, i: number) => (
    <div key={i} style={{position: 'absolute', left: -60, top: h / 2 - 34, width: w + 120, height: 68, transform: `rotate(${rot}deg) scaleX(${clamp01(p * 1.6 - i * 0.3)})`, transformOrigin: i ? '100% 50%' : '0 50%', borderRadius: 34, background: C.paper, boxShadow: '0 10px 20px -8px rgba(25,43,42,0.45), inset 0 0 0 3px rgba(23,97,90,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center'}}>
      <div style={{whiteSpace: 'nowrap', fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 28, color: C.teal, paddingLeft: 30}}>
        {(NAME + ' — ' + PHRASES.join(' — ') + RIBBON_TEXT).toUpperCase()}
      </div>
    </div>
  );
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {band(-14, 0)}
      {band(16, 1)}
      <div style={{position: 'absolute', left: w / 2 - 40, top: h / 2 - 40, width: 80, height: 80, borderRadius: '50%', background: C.teal, boxShadow: '0 10px 20px -8px rgba(25,43,42,0.5)', transform: `scale(${clamp01(p * 2 - 0.8)})`, display: 'grid', placeItems: 'center'}}>
        <div style={{width: 34, height: 34, borderRadius: '50%', background: C.tealBright}} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- caution card (fictional)
export const CAUTION = {w: 720, h: 360};
export const CautionCard: React.FC<{rows: number[]}> = ({rows}) => (
  <Card3D w={CAUTION.w} h={CAUTION.h} depth={22} radius={40} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 74, background: C.amberSoft, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
        <div style={{width: 40, height: 40, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center'}}>
          <Disp size={28} weight={800} color={C.cream}>
            !
          </Disp>
        </div>
        <Txt size={24} weight={800} color="#8A5A1E" style={{letterSpacing: '0.14em'}}>
          CAUTION
        </Txt>
      </div>
      <Txt size={16} weight={700} color="#8A5A1E" style={{letterSpacing: '0.12em'}}>
        FICTIONAL
      </Txt>
    </div>
    <div style={{position: 'absolute', left: 34, right: 34, top: 100, display: 'flex', flexDirection: 'column', gap: 14}}>
      {['UNNECESSARY NAME KEYWORDS', 'POLICY VIOLATION RISK', 'POSSIBLE PROFILE SUSPENSION'].map((r, i) => (
        <div key={r} style={{display: 'flex', alignItems: 'center', gap: 14, opacity: clamp01(rows[i] * 2), transform: `translateX(${(1 - rows[i]) * -24}px)`}}>
          <div style={{width: 12, height: 12, borderRadius: '50%', background: i === 2 ? '#B5792C' : C.amber}} />
          <Disp size={36} weight={800} color={i === 0 ? C.charcoal : C.charcoalSoft}>
            {r}
          </Disp>
        </div>
      ))}
    </div>
  </Card3D>
);

// ---------------------------------------------------------------- lesson
export const EXAMPLE = {w: 900, h: 300};
export const ExampleCard: React.FC<{good: boolean; strike?: number}> = ({good, strike = 0}) => (
  <Card3D w={EXAMPLE.w} h={EXAMPLE.h} depth={22} radius={40} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 34, top: 28, display: 'flex', alignItems: 'center', gap: 12}}>
      <div style={{width: 46, height: 46, borderRadius: '50%', background: good ? C.teal : '#B5792C', display: 'grid', placeItems: 'center'}}>
        {good ? (
          <Icon name="check" size={28} color={C.cream} stroke={3.2} />
        ) : (
          <Disp size={30} weight={800} color={C.cream}>
            ✕
          </Disp>
        )}
      </div>
      <Txt size={26} weight={800} color={good ? C.teal : '#9A6526'} style={{letterSpacing: '0.14em'}}>
        {good ? 'CORRECT EXAMPLE' : 'INCORRECT EXAMPLE'}
      </Txt>
    </div>
    <div style={{position: 'absolute', left: 34, right: 34, top: 96, bottom: 26, borderRadius: 24, background: C.ivory, display: 'flex', alignItems: 'center', padding: '0 26px'}}>
      {good ? (
        <Disp size={72} weight={800}>
          Apex Roofing
        </Disp>
      ) : (
        <div style={{position: 'relative'}}>
          <div style={{fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 34, lineHeight: 1.22, color: C.charcoal, opacity: lerp(1, 0.55, strike)}}>
            Apex Roofing — Best Brooklyn Roofer — Emergency Repairs — 24/7 — Cheap — #1
          </div>
          <div style={{position: 'absolute', left: 0, top: '50%', height: 6, width: `${strike * 100}%`, background: '#B5792C', borderRadius: 3, transform: 'rotate(-6deg)'}} />
        </div>
      )}
    </div>
  </Card3D>
);

export type FieldKey = 'name' | 'category' | 'services' | 'hours' | 'areas';
export const FIELDS: Array<{key: FieldKey; label: string; value: string; icon: IconName | 'roof'}> = [
  {key: 'name', label: 'Business name', value: 'Apex Roofing', icon: 'roof'},
  {key: 'category', label: 'Primary category', value: 'Roofing contractor', icon: 'list'},
  {key: 'services', label: 'Services', value: 'Emergency roof repairs · Roof replacement', icon: 'tools'},
  {key: 'hours', label: 'Business hours', value: 'Your real hours (24/7 only if true)', icon: 'clock'},
  {key: 'areas', label: 'Service areas', value: 'Brooklyn · Queens · Manhattan', icon: 'pin'},
];
export const FIELDS_CARD = {w: 900, h: 640};
export const FieldsCard: React.FC<{fill: number[]; check: number[]}> = ({fill, check}) => (
  <Card3D w={FIELDS_CARD.w} h={FIELDS_CARD.h} depth={24} radius={44} face={C.paper} edge={EDGE.paper} lift={80} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 36, right: 36, top: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <Txt size={24} weight={800} style={{letterSpacing: '0.14em'}}>
        THE RIGHT FIELDS
      </Txt>
      <div style={{padding: '5px 14px', borderRadius: 999, background: C.mintSoft}}>
        <Txt size={17} weight={700} color={C.teal} style={{letterSpacing: '0.12em'}}>
          ILLUSTRATIVE
        </Txt>
      </div>
    </div>
    <div style={{position: 'absolute', left: 30, right: 30, top: 84, display: 'flex', flexDirection: 'column', gap: 12}}>
      {FIELDS.map((f, i) => (
        <div key={f.key} style={{height: 98, borderRadius: 22, background: C.ivory, display: 'flex', alignItems: 'center', gap: 18, padding: '0 20px'}}>
          <div style={{width: 52, height: 52, borderRadius: 16, background: C.teal, display: 'grid', placeItems: 'center', flexShrink: 0}}>
            {f.icon === 'roof' ? <RoofGlyph size={30} /> : <Icon name={f.icon} size={28} color={C.cream} />}
          </div>
          <div style={{flex: 1, minWidth: 0}}>
            <Txt size={18} weight={800} color={C.muted} style={{letterSpacing: '0.12em'}}>
              {f.label.toUpperCase()}
            </Txt>
            <div style={{height: 38, marginTop: 4, overflow: 'hidden'}}>
              <div style={{opacity: clamp01(fill[i] * 2), transform: `translateY(${(1 - fill[i]) * 30}px)`}}>
                <Txt size={i === 0 ? 32 : 27} weight={i === 0 ? 800 : 700}>
                  {f.value}
                </Txt>
              </div>
            </div>
          </div>
          <div style={{width: 44, height: 44, borderRadius: '50%', border: `3px solid ${check[i] > 0.5 ? C.teal : C.hair}`, background: check[i] > 0.5 ? C.teal : 'transparent', display: 'grid', placeItems: 'center', transform: `scale(${1 + 0.2 * Math.sin(Math.PI * clamp01(check[i]))})`}}>
            {check[i] > 0.5 && <Icon name="check" size={24} color={C.cream} stroke={3.2} />}
          </div>
        </div>
      ))}
    </div>
  </Card3D>
);

/** A small keyword card (the discarded words). */
export const KeyChip: React.FC<{label: string; tone?: number}> = ({label, tone = 0}) => (
  <div style={{display: 'inline-block', padding: '10px 18px', borderRadius: 16, background: tone ? C.amberSoft : C.paper, boxShadow: '0 10px 18px -10px rgba(25,43,42,0.5), 0 0 0 2px rgba(25,43,42,0.06)', whiteSpace: 'nowrap'}}>
    <Disp size={24} weight={800} color={tone ? '#9A6526' : C.teal}>
      {label}
    </Disp>
  </div>
);

// ---------------------------------------------------------------- website copy ("in actual sentences")
export const SITE = {w: 680, h: 560};
export const WebsiteCard: React.FC<{p: number; period: number; t: number}> = ({p, period, t}) => {
  const line = (i: number) => clamp01(p * 5 - i * 0.7);
  const body = 'Storm damage or a sudden leak? Our crew repairs roofs across Brooklyn, Queens and Manhattan';
  return (
    <Card3D w={SITE.w} h={SITE.h} depth={22} radius={36} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 60, background: C.ivory, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px'}}>
        {['#E3A79A', C.amber, C.mint].map((c) => (
          <div key={c} style={{width: 14, height: 14, borderRadius: '50%', background: c}} />
        ))}
        <div style={{marginLeft: 12, flex: 1, height: 34, borderRadius: 999, background: C.paper, display: 'flex', alignItems: 'center', padding: '0 16px'}}>
          <Txt size={18} weight={600} color={C.muted}>
            apexroofing.example
          </Txt>
        </div>
      </div>
      <div style={{position: 'absolute', left: 36, right: 36, top: 88}}>
        <div style={{opacity: line(0), transform: `translateY(${(1 - line(0)) * 20}px)`}}>
          <Disp size={36} weight={800} style={{lineHeight: 1.15}}>
            Emergency Roof Repairs in Brooklyn
          </Disp>
        </div>
        <div style={{marginTop: 12, opacity: line(1), transform: `translateY(${(1 - line(1)) * 20}px)`}}>
          <Txt size={25} weight={500} color={C.charcoalSoft} style={{whiteSpace: 'normal', lineHeight: 1.4}}>
            {body}
            <span style={{fontWeight: 800, color: C.teal, display: 'inline-block', transform: `scale(${1 + 0.6 * Math.sin(Math.PI * clamp01((period - 0.5) * 2))})`, opacity: period > 0.5 ? 1 : 0}}>.</span>
            {period < 0.6 && p > 0.9 && <span style={{display: 'inline-block', width: 3, height: 28, marginLeft: 2, background: C.teal, verticalAlign: 'middle', opacity: Math.sin(t * 14) > -0.2 ? 1 : 0}} />}
          </Txt>
        </div>
        <div style={{marginTop: 22, opacity: line(2), transform: `translateY(${(1 - line(2)) * 20}px)`}}>
          <Disp size={32} weight={800} style={{lineHeight: 1.15}}>
            Roof Replacement &amp; Leak Repair
          </Disp>
        </div>
        <div style={{marginTop: 10, opacity: line(3), transform: `translateY(${(1 - line(3)) * 20}px)`}}>
          <Txt size={25} weight={500} color={C.charcoalSoft} style={{whiteSpace: 'normal', lineHeight: 1.4}}>
            Shingle and flat roofs, with free estimates and clear pricing.
          </Txt>
        </div>
      </div>
      <div style={{position: 'absolute', right: 26, bottom: 18, padding: '3px 12px', borderRadius: 999, background: C.mintSoft}}>
        <Txt size={15} weight={700} color={C.teal} style={{letterSpacing: '0.1em'}}>
          EXAMPLE PAGE
        </Txt>
      </div>
    </Card3D>
  );
};

/** Small idea bulb (pops over his head on "I figured it out!"). */
export const IdeaBulb: React.FC<{p: number; t: number}> = ({p, t}) => (
  <svg width={110} height={130} viewBox="0 0 110 130" style={{overflow: 'visible', opacity: clamp01(p * 2), transform: `scale(${lerp(0.4, 1, p)})`, transformOrigin: '50% 100%'}}>
    {[0, 1, 2, 3, 4].map((i) => {
      const a = (-150 + i * 30) * (Math.PI / 180);
      const r0 = 52;
      const r1 = 66 + Math.sin(t * 8 + i) * 3;
      return <line key={i} x1={55 + Math.cos(a) * r0} y1={52 + Math.sin(a) * r0} x2={55 + Math.cos(a) * r1} y2={52 + Math.sin(a) * r1} stroke={C.amber} strokeWidth={6} strokeLinecap="round" />;
    })}
    <circle cx={55} cy={52} r={34} fill="#F6D58A" stroke={C.amber} strokeWidth={4} />
    <circle cx={45} cy={42} r={9} fill="rgba(255,255,255,0.7)" />
    <rect x={40} y={86} width={30} height={14} rx={4} fill="#9AA8A4" />
    <rect x={43} y={102} width={24} height={10} rx={4} fill="#7E8C88" />
  </svg>
);
