import React from 'react';
import {AbsoluteFill, interpolateColors} from 'remotion';
import {COPY} from '../content';
import {C} from '../theme';
import {E, lerp, prog, tw} from '../lib/anim';
import {CreamEnv, RevealLine, Wordmark, body, headline} from '../components/Primitives';
import {Icon} from '../components/Icons';
import {Lens} from '../components/Lens';
import {NODE_Y, SPINE_X, S6_EXIT} from './S6Approach';

// Scene 7 · 34–40s · Brand reveal and invitation
// The workflow marker becomes a search lens, travels across the line of the wordmark
// revealing it (with a magnified view inside the lens), then settles into the brand's
// warm dot. Reveal completes by ~36.5s; the final composition holds to the end.

export const WM = {size: 124, cy: 760};
// Centre of the wordmark's dot at WM.size (measured from a render of the wordmark).
export const DOT = {x: 900, y: 791, d: WM.size * 0.2};

const LENS_D = 200;
const LENS_START = {x: 205, y: WM.cy};
const TRAVEL = {start: 1034, end: 1066};
const COLLAPSE = {start: 1066, end: 1078};

export const S7Reveal: React.FC<{frame: number}> = ({frame: f}) => {
  // Bridge: marker (node 4) -> ring, along a curve.
  const b = prog(f, S6_EXIT + 2, 34, E.inOut);
  const p0 = {x: SPINE_X, y: NODE_Y[3]};
  const p1 = {x: 90, y: 1060};
  const p2 = LENS_START;
  const bx = (1 - b) * (1 - b) * p0.x + 2 * (1 - b) * b * p1.x + b * b * p2.x;
  const by = (1 - b) * (1 - b) * p0.y + 2 * (1 - b) * b * p1.y + b * b * p2.y;

  const t = prog(f, TRAVEL.start, TRAVEL.end - TRAVEL.start, E.inOut);
  const c = prog(f, COLLAPSE.start, COLLAPSE.end - COLLAPSE.start, E.inOut);
  const lx = f < TRAVEL.start ? bx : lerp(LENS_START.x, DOT.x, t);
  const ly = f < TRAVEL.start ? by : lerp(LENS_START.y, DOT.y, t);
  const growD = lerp(30, LENS_D, prog(f, S6_EXIT + 4, 30, E.inOut));
  const d = f < COLLAPSE.start ? growD : lerp(LENS_D, DOT.d, c);
  const stroke = f < COLLAPSE.start ? lerp(15, 8, prog(f, S6_EXIT + 4, 24, E.inOut)) : lerp(8, DOT.d / 2, c);
  const handle = prog(f, 1018, 14, E.out) * (1 - prog(f, COLLAPSE.start - 4, 10, E.in));
  const lensColor = interpolateColors(c, [0, 1], [C.teal, C.accent]);
  const fillDot = f < S6_EXIT + 10 ? C.teal : undefined;
  const lensOn = f < COLLAPSE.end;

  const revealX = f < TRAVEL.start ? 0 : f >= COLLAPSE.start ? 1080 : lx;
  const sweep = prog(f, 1076, 26, E.inOutSoft);
  const settle = prog(f, COLLAPSE.end - 2, 10, E.back);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{opacity: prog(f, S6_EXIT, 20, E.soft)}}>
        <CreamEnv haloX={540} haloY={WM.cy + 40} halo={tw(f, 1020, 40, 0.4, 1)} lines={0.6} />
      </AbsoluteFill>

      {/* Teal light passing behind the wordmark */}
      {sweep > 0 && sweep < 1 && (
        <div
          style={{
            position: 'absolute',
            left: lerp(-200, 1080, sweep) - 160,
            top: WM.cy - 170,
            width: 320,
            height: 340,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(23,97,90,0.28), rgba(183,216,197,0.25) 50%, rgba(183,216,197,0))',
            filter: 'blur(10px)',
          }}
        />
      )}

      {/* Trail line from the workflow into the reveal */}
      {f < 1040 && (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - prog(f, 1018, 18, E.soft)}}>
          <path
            d={`M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`}
            fill="none"
            stroke={C.teal}
            strokeWidth={5}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={`${b} 1`}
            opacity={0.5}
          />
        </svg>
      )}

      {/* Wordmark revealed behind the travelling lens */}
      <AbsoluteFill style={{clipPath: `inset(0 ${1080 - revealX}px 0 0)`}}>
        <WordmarkRow dotScale={settle} dotOpacity={f >= COLLAPSE.end - 2 ? 1 : 0} />
      </AbsoluteFill>

      {/* Magnified view inside the lens */}
      {lensOn && f >= TRAVEL.start - 6 && (
        <AbsoluteFill style={{clipPath: `circle(${Math.max(0, d / 2 - stroke / 2)}px at ${lx}px ${ly}px)`}}>
          <AbsoluteFill style={{background: C.cream}} />
          <AbsoluteFill style={{transformOrigin: `${lx}px ${ly}px`, transform: `scale(${1.16 - c * 0.16})`}}>
            <AbsoluteFill style={{background: 'radial-gradient(400px 260px at 540px 800px, rgba(183,216,197,0.6), rgba(183,216,197,0))'}} />
            <WordmarkRow dotScale={0} dotOpacity={0} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {lensOn && f >= S6_EXIT && (
        <Lens x={lx} y={ly} d={d} stroke={stroke} handle={handle} color={lensColor} fill={fillDot} halo={0.5 * (1 - c)} />
      )}

      {/* Tagline + CTA */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 902, textAlign: 'center'}}>
        <div style={{width: tw(f, 1078, 16, 0, 140), height: 4, borderRadius: 2, background: C.mint, margin: '0 auto 40px'}} />
        <RevealLine frame={f} at={1080}>
          <div style={headline(104, C.charcoal)}>{COPY.s7.lines[0]}</div>
        </RevealLine>
        <RevealLine frame={f} at={1085} style={{marginTop: 10}}>
          <div style={headline(66, C.teal)}>{COPY.s7.lines[1]}</div>
        </RevealLine>
      </div>
      <UrlPill f={f} />
      <div
        style={{
          position: 'absolute',
          left: 90,
          right: 90,
          top: 1392,
          textAlign: 'center',
          ...body(34, C.muted, 500),
          opacity: prog(f, 1094, 16, E.soft),
        }}
      >
        Independent SEO consulting · Mehedi Hassan
      </div>
    </AbsoluteFill>
  );
};

const WordmarkRow: React.FC<{dotScale: number; dotOpacity: number}> = ({dotScale, dotOpacity}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: WM.cy - WM.size / 2, height: WM.size, display: 'flex', justifyContent: 'center'}}>
    <Wordmark size={WM.size} dotScale={dotScale} dotOpacity={dotOpacity} />
  </div>
);

const UrlPill: React.FC<{f: number}> = ({f}) => {
  const p = prog(f, 1084, 16, E.out);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 1196,
        display: 'flex',
        justifyContent: 'center',
        opacity: p,
        transform: `translateY(${(1 - p) * 40}px) scale(${0.94 + 0.06 * p})`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 26,
          height: 128,
          padding: '0 22px 0 48px',
          borderRadius: 64,
          background: C.charcoal,
          boxShadow: '16px 30px 60px -24px rgba(25,43,42,0.55), 0 0 0 1px rgba(255,255,255,0.4) inset',
        }}
      >
        <span style={{...body(58, C.cream, 600), letterSpacing: '-0.02em'}}>{COPY.s7.url}</span>
        <div style={{width: 88, height: 88, borderRadius: '50%', background: C.mint, display: 'grid', placeItems: 'center'}}>
          <Icon name="arrow" size={44} color={C.charcoal} stroke={2.4} />
        </div>
      </div>
    </div>
  );
};
