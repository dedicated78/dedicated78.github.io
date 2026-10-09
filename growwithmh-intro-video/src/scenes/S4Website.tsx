import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, shadow} from '../theme';
import {E, kf, lerp, mix, prog, rand, tw} from '../lib/anim';
import {Bar, Brackets, CreamEnv, RevealLine, body, headline} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Plane, Stage} from '../components/Stage';
import {BusinessPanel, PANEL, PANEL_HANDOFF, PANEL_REST} from './S3Local';

// Scene 4 · 14–21s · Website foundations and content
// Bridge in: Scene 3's business panel rotates edge-on and returns as a website while
// light sweeps the frame from charcoal to cream. An inspection scan then stops on three
// areas and each one visibly becomes more organised. Bridge out: the services block
// lifts out of the page (continued in S5).

export const BROWSER = {cx: 540, cy: 990, w: 840, h: 960};
const SWAP = 410; // panel is edge-on: swap business face for website face

// Inspection stops (panel-local y of the scan line) and timing.
const STOPS = [
  {at: 452, y: 290, box: {x: 20, y: 140, w: 800, h: 300}},
  {at: 500, y: 590, box: {x: 20, y: 450, w: 800, h: 270}},
  {at: 552, y: 830, box: {x: 20, y: 728, w: 800, h: 212}},
];
const CALLOUT_AT = [470, 520, 572];
const CALLOUT_ICON: IconName[] = ['gear', 'page', 'link'];

/** Services section rect in screen space at the lift (camera at rest). */
export const SERVICES_SCREEN = {cx: 540, cy: BROWSER.cy - BROWSER.h / 2 + 585, w: 800, h: 270};
export const LIFT_HANDOFF = 606;

export const S4Website: React.FC<{frame: number}> = ({frame: f}) => {
  // --- Rotation bridge (S3 -> S4) ---
  const a = prog(f, PANEL_HANDOFF, SWAP - PANEL_HANDOFF, E.in);
  const b = prog(f, SWAP, 24, E.out);
  const settle = prog(f, SWAP + 20, 24, E.soft);
  // S3 camera at hand-off: s = 0.94 around (540, 1080).
  const startCy = 1080 + (PANEL.cy - 1080) * 0.94;
  const showBusiness = f < SWAP;
  const ry = showBusiness ? lerp(PANEL_REST.ry, -90, a) : lerp(90, 8, b) - settle * 5;
  const rx = showBusiness ? lerp(PANEL_REST.rx, 6, a) : lerp(6, 3, b) - settle * 1;
  const pcx = 540;
  const pcy = showBusiness ? lerp(startCy, 950, a) : lerp(950, BROWSER.cy, b);
  const ps = showBusiness ? lerp(0.94, 1, a) : 1;

  const wipe = prog(f, 398, 30, E.inOut);
  const wipeMask = wipe >= 1 ? undefined : `linear-gradient(to left, black ${wipe * 130 - 20}%, transparent ${wipe * 130}%)`;

  // --- Camera: close-up on services during stop 2 ---
  const close = kf(f, [508, 530], [0, 1], E.inOut) * (1 - kf(f, [556, 582], [0, 1], E.inOut));
  const camS = 1 + close * 0.36;
  const camY = lerp(BROWSER.cy, SERVICES_SCREEN.cy, close);

  // --- Exit (S4 -> S5) ---
  const lift = prog(f, 598, 10, E.out);
  const recede = prog(f, LIFT_HANDOFF, 26, E.in);

  // --- Work progress ---
  const tech = prog(f, 476, 20, E.inOut);
  const svc = prog(f, 526, 22, E.inOut);
  const links = prog(f, 576, 20, E.inOut);

  // Scan line position (panel-local y)
  const scanY = kf(
    f,
    [440, STOPS[0].at, STOPS[0].at + 40, STOPS[1].at, STOPS[1].at + 44, STOPS[2].at, STOPS[2].at + 40],
    [0, STOPS[0].y, STOPS[0].y, STOPS[1].y, STOPS[1].y, STOPS[2].y, STOPS[2].y],
    E.inOut,
  );
  const scanOn = tw(f, 440, 10, 0, 1) * (1 - prog(f, 594, 10, E.soft));

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{maskImage: wipeMask, WebkitMaskImage: wipeMask}}>
        <CreamEnv haloY={900} halo={1 - recede * 0.6} />
      </AbsoluteFill>
      {/* Light band riding the wipe edge */}
      {wipe > 0 && wipe < 1 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: `linear-gradient(to left, rgba(0,0,0,0) ${wipe * 130 - 26}%, rgba(183,216,197,0.55) ${wipe * 130 - 8}%, rgba(251,250,246,0.9) ${wipe * 130 - 2}%, rgba(0,0,0,0) ${wipe * 130 + 4}%)`,
            filter: 'blur(24px)',
          }}
        />
      )}

      <Stage cam={{x: 540, y: camY, s: camS}}>
        <Plane
          cx={pcx}
          cy={pcy + recede * 80}
          w={showBusiness ? PANEL.w : BROWSER.w}
          h={showBusiness ? PANEL.h : BROWSER.h}
          rx={rx + recede * 16}
          ry={ry}
          s={ps * (1 - recede * 0.25)}
          z={recede * -400}
          opacity={1 - prog(f, 612, 18, E.soft)}
          preserve
        >
          {showBusiness ? (
            <BusinessPanel f={f} complete />
          ) : (
            <Website f={f} tech={tech} svc={svc} links={links} scanY={scanY} scanOn={scanOn} lift={lift} hideServices={f >= LIFT_HANDOFF} />
          )}
        </Plane>
      </Stage>

      {/* Headlines */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 262, textAlign: 'center', opacity: 1 - close * 0.92, filter: close > 0.01 ? `blur(${close * 6}px)` : undefined}}>
        <RevealLine frame={f} at={438} outAt={600}>
          <div style={headline(88, C.charcoal)}>{COPY.s4.headline[0]}</div>
        </RevealLine>
        <RevealLine frame={f} at={528} outAt={603}>
          <div style={headline(88, C.teal)}>{COPY.s4.headline[1]}</div>
        </RevealLine>
      </div>
    </AbsoluteFill>
  );
};

const Website: React.FC<{
  f: number;
  tech: number;
  svc: number;
  links: number;
  scanY: number;
  scanOn: number;
  lift: number;
  hideServices: boolean;
}> = ({f, tech, svc, links, scanY, scanOn, lift, hideServices}) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 30,
        background: C.paper,
        boxShadow: shadow.creamPanel,
        border: `1.5px solid ${C.creamLine}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Browser chrome */}
      <div style={{height: 64, background: C.creamDeep, display: 'flex', alignItems: 'center', padding: '0 26px', gap: 10, borderBottom: `1.5px solid ${C.creamLine}`}}>
        {[C.accent, C.mint, 'rgba(97,113,106,0.4)'].map((c) => (
          <div key={c} style={{width: 15, height: 15, borderRadius: '50%', background: c}} />
        ))}
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <div style={{...body(24, C.muted, 500), height: 40, width: 400, borderRadius: 20, background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10}}>
            <Icon name="globe" size={22} color={C.teal} />
            {COPY.s4.url}
          </div>
        </div>
        <div style={{width: 60}} />
      </div>

      {/* Nav */}
      <div style={{height: 76, display: 'flex', alignItems: 'center', padding: '0 40px', gap: 30}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, flex: 1}}>
          <div style={{width: 36, height: 36, borderRadius: 10, background: C.teal}} />
          <Bar w={120} h={14} color="rgba(25,43,42,0.75)" />
        </div>
        {COPY.s4.nav.map((n, i) => (
          <div key={n} style={{...body(24, C.muted, 500), position: 'relative'}}>
            {n}
            {i === 1 && (
              <div
                style={{
                  position: 'absolute',
                  right: -16,
                  top: -6,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: mix(tech, C.accent, C.teal),
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Hero */}
      <div style={{position: 'absolute', left: 40, top: 160, width: 460}}>
        <div style={{transform: `translate(${(1 - tech) * 16}px, ${(1 - tech) * 6}px) rotate(${(1 - tech) * -1.6}deg)`}}>
          <div style={{...headline(54, C.charcoal), lineHeight: 1.08}}>
            {COPY.s4.heroTitle[0]}
            <br />
            {COPY.s4.heroTitle[1]}
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 22}}>
          <Bar w={380} h={13} />
          <Bar w={300} h={13} />
        </div>
        <div
          style={{
            ...body(26, mix(links, C.muted, C.cream), 600),
            marginTop: 26,
            height: 58,
            width: 220,
            borderRadius: 29,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: mix(links, 'rgba(25,43,42,0.08)', C.teal),
          }}
        >
          {COPY.s4.cta}
          <Icon name="arrow" size={24} color={mix(links, C.muted, C.cream)} />
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 530,
          top: 160,
          width: 270,
          height: 250,
          borderRadius: 24,
          background: 'linear-gradient(160deg, rgba(183,216,197,0.75), rgba(183,216,197,0.35))',
          display: 'grid',
          placeItems: 'center',
          transform: `translateY(${(1 - tech) * -10}px)`,
        }}
      >
        <Icon name="tools" size={96} color={C.teal} stroke={1.4} />
      </div>

      {/* Technical tags: scattered issues snap into an orderly, checked structure */}
      {['title', 'H1', 'meta', 'schema'].map((t, i) => {
        const sx = [560, 420, 690, 300][i];
        const sy = [120, 250, 330, 120][i];
        const tx = 40 + i * 112;
        const tyy = 426;
        const p = prog(f, 476 + i * 3, 18, E.out);
        const show = tw(f, 452, 10, 0, 1);
        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: lerp(sx, tx, p),
              top: lerp(sy, tyy, p),
              transform: `rotate(${(1 - p) * (rand(i + 1) * 16 - 8)}deg)`,
              ...body(20, mix(p, C.accent, C.teal), 700),
              fontFamily: 'ui-monospace, "DejaVu Sans Mono", monospace',
              padding: '5px 10px',
              borderRadius: 10,
              background: mix(p, 'rgba(222,137,87,0.14)', 'rgba(183,216,197,0.5)'),
              border: `1.5px solid ${mix(p, 'rgba(222,137,87,0.5)', 'rgba(23,97,90,0.35)')}`,
              opacity: show * (tech > 0 || f > 452 ? 1 : 0),
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{display: 'inline-grid', width: 18 * p, overflow: 'hidden', opacity: p}}>
              <Icon name="check" size={18} color={C.teal} stroke={3} />
            </span>
            {`<${t}>`}
          </div>
        );
      })}

      {/* Services */}
      <div style={{position: 'absolute', left: 20, top: 450, width: 800, height: 270, opacity: hideServices ? 0 : 1}}>
        <ServicesBlock svc={svc} lift={lift} />
      </div>

      {/* Internal links */}
      <svg width={840} height={960} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        {[160, 420, 680].map((x, i) => {
          const p = prog(f, 576 + i * 4, 18, E.inOut);
          return (
            <path
              key={x}
              d={`M ${x} 712 C ${x} 770, 420 760, 420 810`}
              fill="none"
              stroke={C.teal}
              strokeWidth={4}
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={`${p} 1`}
              opacity={0.85}
            />
          );
        })}
        {(() => {
          const p = prog(f, 584, 18, E.inOut);
          return (
            <path d="M 150 430 C 70 480, 60 600, 60 640" fill="none" stroke={C.teal} strokeWidth={4} strokeLinecap="round" pathLength={1} strokeDasharray={`${p} 1`} opacity={0.6} />
          );
        })()}
      </svg>
      {[160, 420, 680].map((x, i) => {
        const p = prog(f, 586 + i * 3, 12, E.back);
        return (
          <div
            key={x}
            style={{
              position: 'absolute',
              left: (x + 420) / 2 - 20,
              top: 742,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: C.paper,
              border: `2px solid ${C.teal}`,
              display: 'grid',
              placeItems: 'center',
              transform: `scale(${p})`,
            }}
          >
            <Icon name="link" size={22} color={C.teal} stroke={2.2} />
          </div>
        );
      })}

      {/* Contact block */}
      <div
        style={{
          position: 'absolute',
          left: 40,
          right: 40,
          top: 812,
          height: 112,
          borderRadius: 24,
          background: mix(links, C.creamDeep, 'rgba(183,216,197,0.4)'),
          display: 'flex',
          alignItems: 'center',
          padding: '0 30px',
          justifyContent: 'space-between',
        }}
      >
        <div style={body(32, C.charcoal, 700)}>Ready to talk?</div>
        <div
          style={{
            ...body(26, C.cream, 600),
            height: 60,
            padding: '0 28px',
            borderRadius: 30,
            background: mix(links, 'rgba(97,113,106,0.55)', C.teal),
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Icon name="phone" size={24} color={C.cream} />
          {COPY.s4.cta}
        </div>
      </div>

      {/* Scan band */}
      {scanOn > 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: scanY - 90, height: 180, opacity: scanOn, pointerEvents: 'none'}}>
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(23,97,90,0) 0%, rgba(23,97,90,0.10) 45%, rgba(183,216,197,0.35) 50%, rgba(23,97,90,0.10) 55%, rgba(23,97,90,0) 100%)'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 89, height: 3, background: C.teal, boxShadow: '0 0 16px 4px rgba(23,97,90,0.45)'}} />
        </div>
      )}

      {/* Brackets + callouts (float above the page) */}
      {STOPS.map((s, i) => {
        const on = prog(f, s.at, 10, E.out) * (1 - prog(f, (STOPS[i + 1]?.at ?? 594) - 2, 8, E.soft));
        return <Brackets key={i} x={s.box.x} y={s.box.y} w={s.box.w} h={s.box.h} opacity={on} />;
      })}
      {COPY.s4.callouts.map((c, i) => {
        const at = CALLOUT_AT[i];
        const pin = prog(f, at, 14, E.back);
        const fold = prog(f, at + 34, 12, E.inOut);
        const box = STOPS[i].box;
        return (
          <div
            key={c}
            style={{
              position: 'absolute',
              left: box.x + box.w / 2,
              top: box.y - 34,
              transform: `translate(-50%, 0) translateZ(60px) scale(${(0.7 + 0.3 * pin) * (1 - fold * 0.35)})`,
              opacity: pin * (1 - fold),
              ...body(44, C.charcoal, 600),
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 30px 14px 16px',
              borderRadius: 999,
              background: C.paper,
              border: `2px solid ${C.teal}`,
              boxShadow: '12px 24px 40px -16px rgba(25,43,42,0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{width: 56, height: 56, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
              <Icon name={CALLOUT_ICON[i]} size={32} color={C.cream} stroke={2.1} />
            </div>
            {c}
          </div>
        );
      })}
      {/* Folded callouts leave a small check badge on the improved area */}
      {STOPS.map((s, i) => {
        const p = prog(f, CALLOUT_AT[i] + 40, 10, E.back);
        if (p <= 0) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: s.box.x + s.box.w - 22,
              top: s.box.y - 14,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.teal,
              display: 'grid',
              placeItems: 'center',
              transform: `scale(${p})`,
              boxShadow: '0 6px 14px rgba(23,97,90,0.35)',
            }}
          >
            <Icon name="check" size={26} color={C.cream} stroke={3} />
          </div>
        );
      })}
    </div>
  );
};

const SERVICE_ICONS: IconName[] = ['tools', 'gear', 'loop'];

/** The website's services section. Also used as the lifted block that travels into S5. */
export const ServicesBlock: React.FC<{svc: number; lift?: number}> = ({svc, lift = 0}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 26,
      padding: '18px 20px',
      background: lift > 0 ? `rgba(255,255,255,${lift})` : 'transparent',
      boxShadow: lift > 0 ? `0 0 0 ${3 * lift}px ${C.teal}, 20px 40px 70px -20px rgba(25,43,42,${0.4 * lift})` : undefined,
      transform: `scale(${1 + lift * 0.03})`,
    }}
  >
    <div style={{...body(22, C.muted, 700), textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14}}>Services</div>
    <div style={{display: 'flex', gap: 20}}>
      {COPY.s4.services.map((s, i) => {
        const messy = 1 - svc;
        return (
          <div
            key={s}
            style={{
              width: 240,
              height: 196,
              borderRadius: 22,
              background: mix(svc, C.creamDeep, C.cream),
              border: `1.5px solid ${mix(svc, 'rgba(25,43,42,0.10)', 'rgba(23,97,90,0.25)')}`,
              padding: 20,
              transform: `translate(${messy * [8, -10, 14][i]}px, ${messy * [14, -8, 22][i]}px) rotate(${messy * [-3, 2.4, -1.8][i]}deg)`,
              position: 'relative',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: mix(svc, 'rgba(25,43,42,0.1)', C.teal),
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div style={{opacity: svc}}>
                <Icon name={SERVICE_ICONS[i]} size={34} color={C.cream} stroke={2} />
              </div>
            </div>
            <div style={{position: 'relative', height: 40, marginTop: 18}}>
              <div style={{position: 'absolute', left: 0, top: 10, opacity: 1 - svc}}>
                <Bar w={[150, 120, 170][i]} h={16} color="rgba(25,43,42,0.16)" />
              </div>
              <div style={{...body(30, C.charcoal, 700), letterSpacing: '-0.02em', opacity: svc, transform: `translateY(${(1 - svc) * 10}px)`, whiteSpace: 'nowrap'}}>{s}</div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12}}>
              <Bar w={170} h={10} color="rgba(25,43,42,0.10)" />
              <Bar w={120} h={10} color="rgba(25,43,42,0.10)" />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
