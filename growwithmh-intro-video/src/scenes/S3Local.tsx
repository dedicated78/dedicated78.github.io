import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, shadow} from '../theme';
import {E, kf, lerp, prog, rand, tw} from '../lib/anim';
import {DarkEnv, Pill, RevealLine, body, headline} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Plane, Stage} from '../components/Stage';
import {PIN_HANDOFF, pinChipPos} from './S2Meet';

// Scene 3 · 8–14s · Local search presence
// The pin from Scene 2 lands on a schematic neighbourhood map, a generic business
// profile assembles above it, the camera visits its services and pulls back to show
// the local-search connection. Scene 4 rotates the panel into a website.

const P = 2400; // stage perspective
const ORIGIN_Y = 960;
export const PANEL = {cx: 540, cy: 880, w: 780, h: 520};
/** Resting transform of the business panel; Scene 4's rotation starts from here. */
export const PANEL_REST = {rx: 3, ry: -4};
export const PANEL_HANDOFF = 394;

const MAP = {cx: 540, cy: 1330, w: 1500, h: 1100, z: -150, rx: 62};
// Screen-space projection of the map centre (where the pin's tip stands).
const PIN_TIP = {x: 540, y: ORIGIN_Y + (MAP.cy - ORIGIN_Y) * (P / (P - MAP.z))};
const PIN_LAND = 247;

export const S3Local: React.FC<{frame: number}> = ({frame: f}) => {
  // Dark closes in from the edges toward the pin while the camera pushes through the ring.
  const close = prog(f, 210, 30, E.inOut);
  const holeR = lerp(1500, -300, close);
  const envMask = close >= 1 ? undefined : `radial-gradient(circle at 540px 1030px, transparent ${holeR}px, black ${holeR + 280}px)`;

  // Camera: settle in, push to services, pull back wider for the map relationship.
  const push = kf(f, [300, 330], [0, 1], E.inOut) * (1 - kf(f, [350, 378], [0, 1], E.inOut));
  const wide = kf(f, [350, 378], [0, 1], E.inOut);
  const camS = tw(f, 214, 34, 0.9, 1, E.out) + push * 0.24 - wide * 0.06;
  const camY = lerp(1040, 1080, wide);

  // Exit (S3 -> S4): map tips away, overlays clear.
  const exit = prog(f, 390, 26, E.in);

  const dim = kf(f, [300, 318, 350, 368], [0, 1, 1, 0], E.inOut);

  const panelIn = prog(f, 252, 22, E.out);
  const mapIn = prog(f, 236, 30, E.out);
  const radius = prog(f, 352, 28, E.out);
  const link = prog(f, 356, 24, E.inOut);
  const chipIn = prog(f, 352, 18, E.out) * (1 - prog(f, 388, 10, E.soft));

  const pinVisible = f >= PIN_LAND;
  const squash = kf(f, [PIN_LAND, PIN_LAND + 4, PIN_LAND + 10], [1, 0.9, 1], E.soft);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{maskImage: envMask, WebkitMaskImage: envMask}}>
        <DarkEnv glowX={540} glowY={1150} glow={tw(f, 230, 40, 0.5, 1)} gridShiftY={-f * 0.3} />

        {/* Schematic neighbourhood map (own 3D context so overlays never intersect it) */}
        <Stage cam={{x: 540, y: camY, s: camS}} perspective={P} originY={ORIGIN_Y}>
          <Plane
            cx={MAP.cx}
            cy={MAP.cy + exit * 260}
            w={MAP.w}
            h={MAP.h}
            z={MAP.z}
            rx={MAP.rx + exit * 14 + (1 - mapIn) * 10}
            opacity={mapIn * (1 - exit)}
            preserve
            style={{
              maskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 45%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 50% 50% at 50% 50%, black 45%, transparent 100%)',
            }}
          >
            <NeighbourhoodMap f={f} draw={prog(f, 238, 34, E.inOut)} radius={radius} />
          </Plane>
        </Stage>

        <Stage cam={{x: 540, y: camY, s: camS}} perspective={P} originY={ORIGIN_Y}>

          {/* Location marker */}
          {pinVisible && (
            <Plane
              cx={PIN_TIP.x}
              cy={PIN_TIP.y - 68}
              w={110}
              h={136}
              z={exit * -200}
              origin="50% 100%"
              s={squash}
              opacity={1 - prog(f, 392, 12, E.soft)}
            >
              <SolidPin size={110} />
            </Plane>
          )}

          {/* Search chip that connects to the marker */}
          <Plane cx={300} cy={1452} w={440} h={84} opacity={chipIn} z={(1 - chipIn) * -200}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 42,
                background: 'rgba(32,57,54,0.92)',
                border: '1.5px solid rgba(183,216,197,0.3)',
                boxShadow: shadow.darkPanel,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '0 26px',
              }}
            >
              <Icon name="search" size={34} color={C.mint} stroke={2.2} />
              <span style={body(30, C.mintText, 500)}>{COPY.s1.query}</span>
            </div>
          </Plane>
          <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - prog(f, 388, 10, E.soft)}}>
            <path
              d={`M 470 1418 C 500 1340, 520 1300, ${PIN_TIP.x - 8} ${PIN_TIP.y - 64}`}
              fill="none"
              stroke={C.mint}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray="2 14"
              pathLength={1}
              style={{strokeDasharray: `${link} 1`, opacity: 0.9}}
            />
          </svg>

          {/* Business profile panel */}
          {f < PANEL_HANDOFF && (
            <Plane
              cx={PANEL.cx}
              cy={PANEL.cy}
              w={PANEL.w}
              h={PANEL.h}
              z={(1 - panelIn) * -520}
              rx={lerp(12, PANEL_REST.rx, panelIn)}
              ry={lerp(-26, PANEL_REST.ry, panelIn)}
              opacity={panelIn}
            >
              <BusinessPanel f={f} />
            </Plane>
          )}
        </Stage>

        {/* Headline + service label (screen space, rack-focused during the close-up) */}
        <div
          style={{
            position: 'absolute',
            left: 90,
            right: 90,
            top: 262,
            textAlign: 'center',
            opacity: 1 - dim * 0.75,
            filter: dim > 0.01 ? `blur(${dim * 5}px)` : undefined,
          }}
        >
          <RevealLine frame={f} at={262} outAt={388}>
            <div style={headline(92, C.cream)}>{COPY.s3.headline[0]}</div>
          </RevealLine>
          <RevealLine frame={f} at={268} outAt={391}>
            <div style={headline(92, C.mint)}>{COPY.s3.headline[1]}</div>
          </RevealLine>
          <div
            style={{
              marginTop: 30,
              opacity: prog(f, 282, 16, E.soft) * (1 - prog(f, 388, 10, E.soft)),
              transform: `translateY(${(1 - prog(f, 282, 16, E.out)) * 20}px)`,
            }}
          >
            <Pill dark size={44} style={{padding: '14px 26px', gap: 14}}>
              <Icon name="pin" size={40} color={C.mint} />
              {COPY.s3.label}
            </Pill>
          </div>
        </div>
      </AbsoluteFill>

      {/* Bridge: the pin chip from Scene 2 travels forward and drops onto the map. */}
      {f >= PIN_HANDOFF && f < PIN_LAND && <PinBridge f={f} />}
    </AbsoluteFill>
  );
};

const PinBridge: React.FC<{f: number}> = ({f}) => {
  const from = pinChipPos(PIN_HANDOFF);
  const a = prog(f, PIN_HANDOFF, 22, E.inOut); // forward to centre
  const b = prog(f, 232, PIN_LAND - 232, E.in); // drop onto the map
  const x = lerp(lerp(from.x, 540, a), PIN_TIP.x, b);
  const tipY = lerp(lerp(from.y + 24, 1030, a), PIN_TIP.y, b);
  const size = lerp(lerp(48, 150, a), 110, b);
  const chip = 1 - prog(f, PIN_HANDOFF + 2, 12, E.soft);
  const solid = prog(f, PIN_HANDOFF + 6, 14, E.soft);
  return (
    <>
      {chip > 0 && (
        <div
          style={{
            position: 'absolute',
            left: x - 52 * (1 + a * 0.6),
            top: tipY - 24 - 52 * (1 + a * 0.6),
            width: 104 * (1 + a * 0.6),
            height: 104 * (1 + a * 0.6),
            borderRadius: '50%',
            background: C.paper,
            opacity: chip,
            boxShadow: shadow.creamCard,
          }}
        />
      )}
      <div style={{position: 'absolute', left: x - size / 2, top: tipY - size * 1.24, width: size, height: size * 1.24}}>
        <div style={{position: 'absolute', inset: 0, opacity: 1 - solid, display: 'grid', placeItems: 'center'}}>
          <Icon name="pin" size={size} color={C.teal} stroke={1.9} />
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: solid}}>
          <SolidPin size={size} />
        </div>
      </div>
    </>
  );
};

export const SolidPin: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size * 1.24} viewBox="0 0 40 49.6" style={{display: 'block', overflow: 'visible', filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.45)) drop-shadow(0 0 18px rgba(183,216,197,0.45))'}}>
    <path d="M20 48.5S3 32.6 3 19.5a17 17 0 0 1 34 0C37 32.6 20 48.5 20 48.5Z" fill={C.teal} stroke={C.mint} strokeWidth="2.4" />
    <circle cx="20" cy="19.5" r="7" fill={C.cream} />
  </svg>
);

const NeighbourhoodMap: React.FC<{f: number; draw: number; radius: number}> = ({f, draw, radius}) => {
  const cx = MAP.w / 2;
  const cy = MAP.h / 2;
  const ring = (start: number) => {
    const p = prog(f, start, 34, E.out);
    return p > 0 && p < 1 ? (
      <circle cx={cx} cy={cy} r={40 + p * 260} fill="none" stroke={C.mint} strokeWidth={5} opacity={(1 - p) * 0.8} />
    ) : null;
  };
  const roads = [
    'M0 250 H1500',
    'M0 550 H1500',
    'M0 850 H1500',
    'M300 0 V1100',
    'M750 0 V1100',
    'M1200 0 V1100',
  ];
  const streets = ['M0 400 H1500', 'M0 700 H1500', 'M525 0 V1100', 'M975 0 V1100', 'M0 1000 L1500 120'];
  const blocks: Array<[number, number, number, number]> = [];
  for (const bx of [320, 545, 770, 995]) for (const by of [270, 420, 570, 720]) blocks.push([bx, by, 185, 110]);
  return (
    <svg width={MAP.w} height={MAP.h} viewBox={`0 0 ${MAP.w} ${MAP.h}`} style={{display: 'block'}}>
      <rect width={MAP.w} height={MAP.h} fill="#1E3533" />
      {blocks.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} rx={14} fill={i === 9 || i === 10 ? 'rgba(183,216,197,0.16)' : 'rgba(183,216,197,0.055)'} opacity={draw} />
      ))}
      <path d="M0 960 C 300 900, 520 1060, 820 990 S 1300 900, 1500 960" stroke="rgba(23,97,90,0.9)" strokeWidth={46} fill="none" opacity={draw} />
      <g fill="none" stroke="rgba(183,216,197,0.30)" strokeLinecap="round">
        {roads.map((d) => (
          <path key={d} d={d} strokeWidth={16} pathLength={1} strokeDasharray={`${draw} 1`} />
        ))}
      </g>
      <g fill="none" stroke="rgba(183,216,197,0.16)" strokeLinecap="round">
        {streets.map((d) => (
          <path key={d} d={d} strokeWidth={7} pathLength={1} strokeDasharray={`${draw} 1`} />
        ))}
      </g>
      {/* Service radius + nearby searchers (conceptual, no data implied) */}
      {radius > 0 && (
        <circle cx={cx} cy={cy} r={radius * 360} fill="rgba(23,97,90,0.28)" stroke={C.mint} strokeWidth={4} strokeDasharray="14 16" opacity={0.95} />
      )}
      {Array.from({length: 8}).map((_, i) => {
        const a = rand(i + 3) * Math.PI * 2;
        const r = 120 + rand(i + 11) * 210;
        const p = prog(f, 358 + i * 3, 12, E.back);
        if (p <= 0) return null;
        return (
          <g key={i} transform={`translate(${cx + Math.cos(a) * r} ${cy + Math.sin(a) * r * 0.9})`} opacity={p}>
            <circle r={26 * p} fill="rgba(183,216,197,0.25)" />
            <circle r={11} fill={C.mint} />
          </g>
        );
      })}
      {ring(PIN_LAND)}
      {ring(PIN_LAND + 8)}
      <ellipse cx={cx} cy={cy} rx={34} ry={34} fill="rgba(0,0,0,0.35)" opacity={f >= PIN_LAND ? 1 : 0} />
    </svg>
  );
};

/** Generic business profile used in Scene 3 (and as the front face in Scene 4's rotation). */
export const BusinessPanel: React.FC<{f: number; complete?: boolean}> = ({f, complete = false}) => {
  const at = (frame: number, dur = 14) => (complete ? 1 : prog(f, frame, dur, E.out));
  const chipCheck = (i: number) => (complete ? 1 : prog(f, 322 + i * 6, 12, E.back));
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 36,
        background: C.cream,
        boxShadow: shadow.creamOnDark,
        padding: '32px 38px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{display: 'flex', alignItems: 'center', gap: 24, opacity: at(260), transform: `translateY(${(1 - at(260)) * 16}px)`}}>
        <div style={{width: 84, height: 84, borderRadius: 22, background: C.teal, display: 'grid', placeItems: 'center'}}>
          <Icon name="tools" size={44} color={C.cream} stroke={2} />
        </div>
        <div style={{flex: 1}}>
          <div style={{...body(46, C.charcoal, 700), letterSpacing: '-0.025em'}}>{COPY.s3.business}</div>
          <div style={body(28, C.muted, 500)}>{COPY.s3.category}</div>
        </div>
        <div style={{width: 64, height: 64, borderRadius: '50%', background: 'rgba(183,216,197,0.45)', display: 'grid', placeItems: 'center'}}>
          <Icon name="pin" size={34} color={C.teal} />
        </div>
      </div>
      <div style={{height: 2, background: C.creamLine, margin: '18px 0 14px', transformOrigin: 'left', transform: `scaleX(${at(266, 18)})`}} />

      {/* Business details */}
      {COPY.s3.rows.map((r, i) => {
        const p = at(270 + i * 6);
        return (
          <div key={r.title} style={{display: 'flex', alignItems: 'center', height: 48, gap: 18, opacity: p, transform: `translateX(${(1 - p) * -24}px)`}}>
            <Icon name={r.icon as IconName} size={30} color={C.teal} />
            <div style={{...body(28, C.muted, 500), width: 200}}>{r.title}</div>
            <div style={body(30, C.charcoal, 600)}>{r.value}</div>
          </div>
        );
      })}

      {/* Services */}
      <div style={{...body(26, C.muted, 600), textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 16, opacity: at(296)}}>
        {COPY.s3.servicesTitle}
      </div>
      <div style={{display: 'flex', gap: 14, marginTop: 12}}>
        {COPY.s3.services.map((s, i) => {
          const p = at(310 + i * 6);
          const c = chipCheck(i);
          return (
            <div
              key={s}
              style={{
                ...body(29, C.teal, 600),
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                height: 62,
                padding: '0 20px',
                borderRadius: 31,
                background: 'rgba(183,216,197,0.42)',
                border: '1.5px solid rgba(23,97,90,0.25)',
                opacity: p,
                transform: `scale(${0.85 + 0.15 * p})`,
              }}
            >
              <span style={{display: 'inline-grid', placeItems: 'center', width: 30 * c, overflow: 'hidden'}}>
                <Icon name="check" size={28} color={C.teal} stroke={2.6} />
              </span>
              {s}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{display: 'flex', gap: 14, marginTop: 20, opacity: at(300)}}>
        {COPY.s3.actions.map((a, i) => (
          <div
            key={a}
            style={{
              ...body(26, i === 0 ? C.cream : C.charcoal, 600),
              flex: 1,
              height: 50,
              borderRadius: 25,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: i === 0 ? C.teal : 'transparent',
              border: i === 0 ? 'none' : `1.5px solid ${C.creamLine}`,
            }}
          >
            <Icon name={(['phone', 'directions', 'globe'] as IconName[])[i]} size={26} color={i === 0 ? C.cream : C.teal} />
            {a}
          </div>
        ))}
      </div>
    </div>
  );
};
