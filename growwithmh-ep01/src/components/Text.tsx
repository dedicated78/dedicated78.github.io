import React from 'react';
import {interpolateColors} from 'remotion';
import {C, FONT_DISPLAY, FONT_TEXT} from '../theme';
import {EZ, Q, WORDS, lerp, pr, speakerAt} from '../timing';

// ---------------------------------------------------------------- captions
type Chunk = {words: typeof WORDS; s: number; e: number};
const CHUNKS: Chunk[] = (() => {
  const out: Chunk[] = [];
  let cur: typeof WORDS = [];
  WORDS.forEach((w, i) => {
    cur.push(w);
    const next = WORDS[i + 1];
    const endPunct = /[.!?]$/.test(w.w);
    const comma = /,$/.test(w.w) && cur.length >= 2;
    const gap = next ? next.s - w.e > 0.35 : true;
    if (endPunct || comma || gap || cur.length >= 4 || !next) {
      out.push({words: cur, s: cur[0].s, e: cur[cur.length - 1].e});
      cur = [];
    }
  });
  return out.map((c, i) => ({...c, s: c.s - 0.06, e: Math.min(out[i + 1] ? out[i + 1].s - 0.07 : c.e + 0.6, c.e + 0.45)}));
})();

const TAGS = {
  owner: {label: 'OWNER', dot: C.amber},
  assistant: {label: 'MAPS ASSISTANT', dot: C.teal},
  narrator: {label: 'GROWWITHMH', dot: C.charcoal},
};

/** Word-synced captions; hidden once the logo takes over. */
export const Captions: React.FC<{t: number; hideFrom?: number}> = ({t, hideFrom = Q.grow - 0.1}) => {
  if (t >= hideFrom) return null;
  const c = CHUNKS.find((k) => t >= k.s && t < k.e);
  if (!c) return null;
  const who = speakerAt(c.words[0].s + 0.01);
  const tag = TAGS[who];
  const pin = pr(t, c.s, 0.14, EZ.back);
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1404, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 999, background: 'rgba(25,43,42,0.86)', opacity: pin}}>
        <div style={{width: 14, height: 14, borderRadius: '50%', background: tag.dot, boxShadow: `0 0 0 3px rgba(251,250,246,0.25)`}} />
        <span style={{fontFamily: FONT_TEXT, fontWeight: 700, fontSize: 24, letterSpacing: '0.12em', color: C.cream}}>{tag.label}</span>
      </div>
      <div
        style={{
          maxWidth: 940,
          padding: '14px 30px',
          borderRadius: 26,
          background: C.paper,
          boxShadow: '0 18px 40px -16px rgba(25,43,42,0.45), 0 0 0 2px rgba(25,43,42,0.06)',
          transform: `translateY(${(1 - pin) * 16}px) scale(${0.94 + 0.06 * pin})`,
          opacity: Math.min(1, pin * 2),
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          columnGap: 14,
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 54,
          lineHeight: 1.18,
          letterSpacing: '-0.01em',
        }}
      >
        {c.words.map((w, i) => {
          const spoken = t >= w.s;
          const active = t >= w.s && t < w.e + 0.04;
          return (
            <span key={i} style={{color: active ? C.teal : spoken ? C.charcoal : 'rgba(25,43,42,0.32)', transform: active ? 'translateY(-2px)' : undefined, display: 'inline-block'}}>
              {w.w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- kicker headline (3D flip-in)
export const Kicker: React.FC<{t: number; at: number; out: number; lines: React.ReactNode[]; size?: number; top?: number; color?: string}> = ({t, at, out, lines, size = 104, top = 262, color = C.charcoal}) => {
  if (t < at - 0.01 || t > out + 0.3) return null;
  return (
    <div style={{position: 'absolute', left: 40, right: 40, top, display: 'flex', flexDirection: 'column', alignItems: 'center', perspective: 900}}>
      {lines.map((l, i) => {
        const p = pr(t, at + i * 0.08, 0.38, EZ.back);
        const o = pr(t, out + i * 0.04, 0.22, EZ.in);
        return (
          <div
            key={i}
            style={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              color,
              whiteSpace: 'nowrap',
              transformOrigin: '50% 100%',
              transform: `rotateX(${lerp(-75, 0, p) + o * 50}deg) scale(${lerp(0.7, 1, p) + o * 0.15}) translateY(${o * -30}px)`,
              opacity: Math.min(1, p * 2) * (1 - o),
              textShadow: '0 10px 30px rgba(25,43,42,0.12)',
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};
export const Hl: React.FC<{children: React.ReactNode; italic?: boolean}> = ({children, italic}) => <span style={{color: C.teal, fontStyle: italic ? 'italic' : 'normal'}}>{children}</span>;

// ---------------------------------------------------------------- GrowwithMH wordmark (the established typographic mark)
export const Wordmark: React.FC<{size: number; mono?: string; dotScale?: number; dotOpacity?: number}> = ({size, mono, dotScale = 1, dotOpacity = 1}) => (
  <div style={{fontFamily: '"GW Display", "Inter", sans-serif', fontWeight: 700, fontSize: size, letterSpacing: '-0.035em', lineHeight: 1, color: mono ?? C.charcoal, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'baseline'}}>
    <span>Growwith</span>
    <span style={{color: mono ?? C.teal}}>MH</span>
    <span style={{display: 'inline-block', width: size * 0.2, height: size * 0.2, marginLeft: size * 0.05, borderRadius: '50%', background: mono ?? '#DE8957', transform: `scale(${dotScale})`, opacity: dotOpacity}} />
  </div>
);

/** Extruded wordmark (depth slices behind the real mark). */
export const Wordmark3D: React.FC<{size: number; rx?: number; ry?: number; s?: number; dotScale?: number; dotOpacity?: number; clipRight?: number}> = ({size, rx = 0, ry = 0, s = 1, dotScale = 1, dotOpacity = 1, clipRight}) => {
  const n = 14;
  const clip = clipRight === undefined ? undefined : `inset(-40% ${clipRight}px -40% -10%)`;
  return (
    <div style={{position: 'relative', transformStyle: 'preserve-3d', transform: `rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`}}>
      {Array.from({length: n}).map((_, i) => (
        <div key={i} style={{position: 'absolute', left: 0, top: 0, transform: `translateZ(${-(i + 1) * 1.4}px)`, clipPath: clip}}>
          <Wordmark size={size} mono={interpolateColors(i / (n - 1), [0, 1], ['#A9CDB9', '#5E8F7E'])} dotScale={dotScale} dotOpacity={dotOpacity} />
        </div>
      ))}
      <div style={{position: 'relative', clipPath: clip}}>
        <Wordmark size={size} dotScale={dotScale} dotOpacity={dotOpacity} />
      </div>
    </div>
  );
};
