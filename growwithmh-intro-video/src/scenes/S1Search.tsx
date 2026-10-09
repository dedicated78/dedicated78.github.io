import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, shadow} from '../theme';
import {E, caretOn, kf, prog, tw, typed} from '../lib/anim';
import {Bar, Cursor, DarkEnv, LightSweep, RevealLine, body, headline} from '../components/Primitives';
import {Icon} from '../components/Icons';
import {Plane, Stage} from '../components/Stage';
import {Lens} from '../components/Lens';

// Scene 1 · 0–4s · "Can customers find you?"
// Charcoal. A dimensional search field types a local query, the camera pushes in,
// then the search lens is isolated and carried into Scene 2 (see S2Meet bridge).

export const S1_FIELD = {cx: 540, cy: 980, w: 780, h: 140};
export const S1_PUSH = 1.14;
/** Frame at which Scene 2 takes over the lens. */
export const S1_LENS_HANDOFF = 96;
/** Screen position/size of the field lens at hand-off (after the camera push). */
export const S1_LENS_AT_HANDOFF = {x: 540 - (S1_FIELD.w / 2 - 72) * S1_PUSH, y: 978, d: 64 * S1_PUSH};

const TYPE_START = 20;
const FPC = 2; // frames per character

export const S1Search: React.FC<{frame: number}> = ({frame: f}) => {
  const push = prog(f, 26, 36, E.inOut);
  const s = 1 + (S1_PUSH - 1) * push;
  // Isolation: everything except the lens dims, defocuses and drops back.
  const iso = prog(f, 90, 22, E.in);

  const text = typed(COPY.s1.query, f, TYPE_START, FPC);
  const typing = f >= TYPE_START && f < TYPE_START + COPY.s1.query.length * FPC + 2;

  // Field entrance: from deep z with a stronger tilt, settling to a readable 6°, then 3° during the push.
  const fz = tw(f, 0, 22, -760, 0) + iso * -240;
  const frx = tw(f, 0, 24, 18, 6) - push * 3;
  const fry = tw(f, 0, 24, -12, -3) + push * 1.5;
  const fOpacity = tw(f, 0, 10, 0, 1, E.soft) * (1 - iso);

  const layer = (i: number) => ({
    p: prog(f, 4 + i * 4, 20, E.out),
    blur: 1.5 + i * 0.8 + push * (3 + i) + iso * 6,
  });
  const L = [layer(0), layer(1), layer(2)];

  const rows = [34, 44, 54].map((at) => prog(f, at, 14, E.out));

  // Cursor clicks into the field before typing.
  const cx = kf(f, [4, 16], [930, 286], E.out) + tw(f, 24, 12, 0, 60, E.in);
  const cy = kf(f, [4, 16], [1420, 1000], E.out) + tw(f, 24, 12, 0, 90, E.in);
  const cOpacity = tw(f, 4, 6, 0, 1) * tw(f, 26, 8, 1, 0);
  const press = kf(f, [16, 18, 22], [0, 1, 0], E.soft);
  const ripple = prog(f, 17, 16, E.out);

  return (
    <AbsoluteFill>
      <DarkEnv glowX={tw(f, 0, 70, 160, 600, E.inOutSoft)} glowY={980} glow={tw(f, 0, 30, 0.4, 1) * (1 - iso * 0.5)} />
      <LightSweep t={prog(f, 0, 50, E.inOutSoft)} color="rgba(183,216,197,0.14)" angle={24} width={600} />

      <Stage cam={{x: 540, y: 980, s}} originY={980}>
        {/* Secondary layers: soft-focus context behind the search field. */}
        <Plane cx={290} cy={742} w={360} h={250} z={-430 - (1 - L[1].p) * 500} rx={8} ry={14} opacity={L[1].p * 0.9 * (1 - iso)} blur={L[1].blur + 1.5}>
          <GlassCard>
            <MiniMap />
          </GlassCard>
        </Plane>
        <Plane cx={795} cy={770} w={330} h={196} z={-330 - (1 - L[2].p) * 500} rx={8} ry={-14} opacity={L[2].p * 0.9 * (1 - iso)} blur={L[2].blur + 1}>
          <GlassCard>
            <div style={{padding: 28, display: 'flex', flexDirection: 'column', gap: 16}}>
              <Icon name="spark" size={40} color={C.mint} />
              <Bar w={220} h={14} color="rgba(183,216,197,0.35)" />
              <Bar w={160} h={14} color="rgba(183,216,197,0.2)" />
            </div>
          </GlassCard>
        </Plane>
        <Plane cx={540} cy={1238} w={700} h={330} z={-220 - (1 - L[0].p) * 500} rx={8} opacity={L[0].p * 0.95 * (1 - iso)} blur={L[0].blur}>
          <GlassCard>
            <div style={{padding: '34px 40px', display: 'flex', flexDirection: 'column', gap: 30}}>
              {rows.map((p, i) => (
                <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, opacity: p, transform: `translateX(${(1 - p) * -30}px)`}}>
                  <div style={{width: 52, height: 52, borderRadius: 16, background: 'rgba(183,216,197,0.14)', display: 'grid', placeItems: 'center'}}>
                    <Icon name="pin" size={30} color={C.mint} />
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                    <Bar w={[300, 260, 330][i]} h={14} color="rgba(251,250,246,0.42)" />
                    <Bar w={[200, 230, 170][i]} h={12} color="rgba(183,216,197,0.22)" />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Plane>

        {/* Teal halo behind the field */}
        <Plane cx={540} cy={1000} w={900} h={300} z={-60} opacity={tw(f, 6, 24, 0, 0.9) * (1 - iso)} blur={50}>
          <div style={{width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(23,97,90,0.85)'}} />
        </Plane>

        {/* Search field */}
        <Plane cx={S1_FIELD.cx} cy={S1_FIELD.cy} w={S1_FIELD.w} h={S1_FIELD.h} z={fz} rx={frx} ry={fry} opacity={fOpacity} blur={iso * 5}>
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 40,
              background: C.cream,
              boxShadow: shadow.creamOnDark,
              display: 'flex',
              alignItems: 'center',
              padding: '0 28px 0 40px',
              gap: 26,
              position: 'relative',
            }}
          >
            <div style={{width: 64, height: 64, position: 'relative', flexShrink: 0, opacity: f < S1_LENS_HANDOFF ? 1 : 0}}>
              <Lens x={26} y={26} d={40} stroke={5} handle={1} />
            </div>
            <div style={{...body(46, C.charcoal, 500), flex: 1, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap'}}>
              <span>{text}</span>
              {f >= 14 && (typing || caretOn(f)) && (
                <span style={{display: 'inline-block', width: 3, height: 52, marginLeft: 4, background: C.teal, borderRadius: 2}} />
              )}
              {text.length === 0 && f < TYPE_START && (
                <span style={{color: C.muted, opacity: 0.55, marginLeft: -3}}>Search</span>
              )}
            </div>
            <div style={{width: 84, height: 84, borderRadius: 26, background: C.teal, display: 'grid', placeItems: 'center', flexShrink: 0}}>
              <Icon name="arrow" size={40} color={C.cream} stroke={2.4} />
            </div>
          </div>
        </Plane>
      </Stage>

      {/* Click ripple + cursor (screen space; the field has not moved yet). */}
      {ripple > 0 && ripple < 1 && (
        <div
          style={{
            position: 'absolute',
            left: 292 - 50 * ripple,
            top: 1004 - 50 * ripple,
            width: 100 * ripple,
            height: 100 * ripple,
            borderRadius: '50%',
            border: `3px solid ${C.teal}`,
            opacity: (1 - ripple) * 0.8,
          }}
        />
      )}
      <Cursor x={cx} y={cy} opacity={cOpacity} press={press} />

      {/* Headline (screen space) */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 300, textAlign: 'center', filter: iso > 0 ? `blur(${iso * 6}px)` : undefined}}>
        <RevealLine frame={f} at={48} outAt={94}>
          <div style={headline(112, C.cream)}>{COPY.s1.headline[0]}</div>
        </RevealLine>
        <RevealLine frame={f} at={54} outAt={97}>
          <div style={headline(112, C.mint)}>{COPY.s1.headline[1]}</div>
        </RevealLine>
      </div>
    </AbsoluteFill>
  );
};

const GlassCard: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 30,
      background: 'linear-gradient(160deg, rgba(39,68,63,0.92), rgba(28,48,46,0.88))',
      border: '1.5px solid rgba(183,216,197,0.18)',
      boxShadow: shadow.darkPanel,
      overflow: 'hidden',
    }}
  >
    {children}
  </div>
);

const MiniMap: React.FC = () => (
  <svg width="100%" height="100%" viewBox="0 0 360 250">
    <g stroke="rgba(183,216,197,0.28)" strokeWidth="7" fill="none" strokeLinecap="round">
      <path d="M-10 80 H370" />
      <path d="M-10 175 H370" />
      <path d="M110 -10 V260" />
      <path d="M250 -10 V260" />
      <path d="M-10 250 L200 -10" strokeWidth="4" />
    </g>
    <rect x="130" y="100" width="100" height="56" rx="10" fill="rgba(183,216,197,0.12)" />
    <g transform="translate(160 64)">
      <path d="M20 54s-17-16-17-29a17 17 0 0 1 34 0c0 13-17 29-17 29Z" fill={C.teal} stroke={C.mint} strokeWidth="2.5" />
      <circle cx="20" cy="25" r="6" fill={C.cream} />
    </g>
  </svg>
);
