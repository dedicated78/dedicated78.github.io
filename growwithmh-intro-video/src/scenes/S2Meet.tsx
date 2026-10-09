import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, shadow} from '../theme';
import {E, kf, lerp, prog, tw} from '../lib/anim';
import {CreamEnv, RevealLine, Wordmark, body} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Lens} from '../components/Lens';
import {Plane, Stage} from '../components/Stage';
import {S1_LENS_AT_HANDOFF, S1_LENS_HANDOFF} from './S1Search';

// Scene 2 · 4–8s · "Meet GrowwithMH"
// Bridge in: the S1 search lens travels to centre and opens into a cream world.
// Bridge out: the local-search (pin) chip moves to the foreground (continued in S3).

export const RING = {x: 540, y: 880, d: 740};
const LENS_TRAVEL = {start: S1_LENS_HANDOFF, dur: 28};

type Chip = {icon: IconName; angle: number; ring: 'main' | 'outer'; label: string};
// One symbol per service area from the company profile.
const CHIPS: Chip[] = [
  {icon: 'page', angle: -122, ring: 'main', label: 'On-page SEO'},
  {icon: 'gear', angle: -58, ring: 'main', label: 'Technical SEO'},
  {icon: 'pin', angle: 58, ring: 'main', label: 'Local SEO & GBP'},
  {icon: 'key', angle: 122, ring: 'main', label: 'Keyword research'},
  {icon: 'route', angle: 196, ring: 'outer', label: 'Audits & roadmaps'},
  {icon: 'spark', angle: -16, ring: 'outer', label: 'AEO & GEO'},
];
const R_MAIN = RING.d / 2;
const R_OUTER = 430;

export const PIN_CHIP_INDEX = 2;
/** Where the pin chip sits when Scene 3 takes it over. */
export const pinChipPos = (f: number) => chipPos(PIN_CHIP_INDEX, f);
export const PIN_HANDOFF = 210;

function chipPos(i: number, f: number) {
  const c = CHIPS[i];
  const settle = 1 - prog(f, 122, 32, E.out);
  const drift = prog(f, 150, 80, E.linear);
  const off = c.ring === 'main' ? -38 * settle + 5 * drift : 34 * settle - 4 * drift;
  const a = ((c.angle + off) * Math.PI) / 180;
  const r = c.ring === 'main' ? R_MAIN : R_OUTER;
  return {x: RING.x + r * Math.cos(a), y: RING.y + r * Math.sin(a)};
}

export const S2Meet: React.FC<{frame: number}> = ({frame: f}) => {
  // --- Lens bridge (S1 -> S2) ---
  const t = prog(f, LENS_TRAVEL.start, LENS_TRAVEL.dur, E.inOut);
  const ty = prog(f, LENS_TRAVEL.start, LENS_TRAVEL.dur, E.out);
  const lx = lerp(S1_LENS_AT_HANDOFF.x, RING.x, t);
  const ly = lerp(S1_LENS_AT_HANDOFF.y, RING.y, ty);
  const ld = lerp(S1_LENS_AT_HANDOFF.d, RING.d, t);
  const lstroke = lerp(5.6, 4, t);
  const handle = 1 - prog(f, LENS_TRAVEL.start, 12, E.in);
  const open = prog(f, 116, 22, E.inOut);
  const clipR = lerp(ld / 2 - lstroke / 2, 1400, open);

  // --- Exit: push through the ring ---
  const push = prog(f, 212, 30, E.in);
  const worldS = 1 + push * 0.75;
  const worldFade = 1 - prog(f, 220, 20, E.soft);
  const worldBlur = push * 10;

  const halo = tw(f, 108, 24, 0, 1) * (1 - push);
  const card = prog(f, 142, 20, E.out);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: `circle(${clipR}px at ${lx}px ${ly}px)`, opacity: prog(f, 100, 16, E.soft)}}>
        <CreamEnv haloY={RING.y} halo={tw(f, 112, 30, 0.3, 1)} lines={tw(f, 120, 30, 0, 1)} />

        <Stage cam={{x: RING.x, y: RING.y, s: worldS}}>
          <AbsoluteFill style={{opacity: worldFade, filter: worldBlur > 0.1 ? `blur(${worldBlur}px)` : undefined}}>
            {/* Orbit guides */}
            <div
              style={{
                position: 'absolute',
                left: RING.x - R_OUTER,
                top: RING.y - R_OUTER,
                width: R_OUTER * 2,
                height: R_OUTER * 2,
                borderRadius: '50%',
                border: '1.5px dashed rgba(23,97,90,0.22)',
                opacity: tw(f, 126, 20, 0, 1),
                transform: `rotate(${f * 0.15}deg) scale(${tw(f, 122, 30, 0.9, 1)})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: RING.x - R_MAIN + 26,
                top: RING.y - R_MAIN + 26,
                width: R_MAIN * 2 - 52,
                height: R_MAIN * 2 - 52,
                borderRadius: '50%',
                border: '1.5px solid rgba(23,97,90,0.14)',
                opacity: tw(f, 124, 20, 0, 1),
              }}
            />

            {/* Brand block inside the ring */}
            <div style={{position: 'absolute', left: 120, right: 120, top: 716, textAlign: 'center'}}>
              <RevealLine frame={f} at={118}>
                <div style={body(52, C.muted, 500)}>{COPY.s2.meet}</div>
              </RevealLine>
              <RevealLine frame={f} at={123} dur={18} style={{marginTop: 18}}>
                <Wordmark size={104} />
              </RevealLine>
              <div
                style={{
                  width: tw(f, 132, 18, 0, 120),
                  height: 3,
                  borderRadius: 2,
                  background: C.mint,
                  margin: '34px auto 26px',
                }}
              />
              <RevealLine frame={f} at={134}>
                <div style={body(46, C.teal, 600)}>{COPY.s2.tagline}</div>
              </RevealLine>
            </div>

            {/* Service symbols in restrained orbit (depth via scale, blur and z-order) */}
            {CHIPS.map((c, i) => {
              if (i === PIN_CHIP_INDEX && f >= PIN_HANDOFF) return null;
              const p = prog(f, 122 + i * 3, 22, E.back);
              const {x, y} = chipPos(i, f);
              const outer = c.ring === 'outer';
              const size = outer ? 84 : 104;
              return (
                <div
                  key={c.icon}
                  style={{
                    position: 'absolute',
                    left: x - size / 2,
                    top: y - size / 2,
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    background: C.paper,
                    border: `1.5px solid ${C.creamLine}`,
                    boxShadow: shadow.creamCard,
                    display: 'grid',
                    placeItems: 'center',
                    opacity: p * (outer ? 0.85 : 1),
                    transform: `scale(${0.4 + 0.6 * p})`,
                    filter: outer ? 'blur(0.6px)' : undefined,
                  }}
                >
                  <Icon name={c.icon} size={outer ? 38 : 48} color={C.teal} stroke={1.9} />
                </div>
              );
            })}
          </AbsoluteFill>
        </Stage>

        {/* Founder card */}
        <Stage cam={{x: 540, y: 1350, s: 1 + push * 0.4}}>
          <Plane cx={540} cy={1352} w={660} h={156} z={(1 - card) * -320} rx={(1 - card) * 22} opacity={card * worldFade} blur={worldBlur * 0.6}>
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 34,
                background: C.paper,
                border: `1.5px solid ${C.creamLine}`,
                boxShadow: shadow.creamPanel,
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                padding: '0 36px',
              }}
            >
              <div style={{width: 96, height: 96, borderRadius: '50%', background: C.charcoal, display: 'grid', placeItems: 'center', flexShrink: 0}}>
                <span style={{...body(36, C.cream, 700), letterSpacing: '-0.02em'}}>
                  M<span style={{color: C.mint}}>H</span>
                </span>
              </div>
              <div>
                <div style={body(32, C.muted, 500)}>{COPY.s2.ledBy}</div>
                <div style={{...body(54, C.charcoal, 700), letterSpacing: '-0.025em', marginTop: 2}}>{COPY.s2.founder}</div>
              </div>
            </div>
          </Plane>
        </Stage>
      </AbsoluteFill>

      {/* The lens / ring itself sits above the clip so its stroke is never cut. */}
      {f < 246 && (
        <div style={{position: 'absolute', inset: 0, transformOrigin: `${RING.x}px ${RING.y}px`, transform: `scale(${worldS})`, opacity: worldFade, filter: worldBlur > 0.1 ? `blur(${worldBlur}px)` : undefined}}>
          <Lens x={lx} y={ly} d={ld} stroke={lstroke} handle={handle} halo={halo} color={C.teal} />
        </div>
      )}
      {/* Kept for continuity with S1's light: a faint mint sheen while the lens opens. */}
      {open > 0 && open < 1 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: `radial-gradient(${clipR + 60}px ${clipR + 60}px at ${lx}px ${ly}px, rgba(0,0,0,0) 92%, rgba(183,216,197,${0.35 * kf(f, [116, 126, 138], [0, 1, 0])}) 97%, rgba(0,0,0,0) 100%)`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
