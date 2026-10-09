import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, shadow} from '../theme';
import {E, kf, lerp, mix, prog, rand, tw} from '../lib/anim';
import {Bar, CreamEnv, RevealLine, body, headline} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {AnswerBlock, QuestionBar, S5_HANDOFF, handoffRects} from './S5Answers';

// Scene 6 · 27–34s · The personal approach
// Bridge in: the question and answer blocks gather into four workflow nodes while a
// cream horizon rises from below (dark -> light). A marker travels the line; each stage
// performs a small action. Bridge out: the marker leaves the line and becomes the ring
// used for the closing reveal (S7).

export const SPINE_X = 170;
export const NODE_Y = [830, 1020, 1210, 1400];
const NODE = 72;
// Marker arrival frame at each node.
export const ARRIVE = [862, 898, 930, 962];
export const S6_EXIT = 984;

export const markerY = (f: number) => {
  if (f <= ARRIVE[0]) return NODE_Y[0];
  for (let i = 1; i < ARRIVE.length; i++) {
    if (f <= ARRIVE[i]) return lerp(NODE_Y[i - 1], NODE_Y[i], prog(f, ARRIVE[i] - 24, 24, E.inOut));
  }
  return NODE_Y[3];
};

export const S6Approach: React.FC<{frame: number}> = ({frame: f}) => {
  // Cream horizon rising from below.
  const rise = prog(f, S5_HANDOFF + 2, 32, E.inOut);
  const R = 2800;
  const cy = 1920 + R - rise * (1920 + 260);
  const clip = rise >= 1 ? undefined : `circle(${R}px at 540px ${cy}px)`;

  const exit = prog(f, S6_EXIT, 18, E.in);
  const lineP = (f: number) => (markerY(f) - NODE_Y[0]) / (NODE_Y[3] - NODE_Y[0]);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: clip}}>
        <CreamEnv haloX={300} haloY={1100} halo={1} lines={0.8} />
      </AbsoluteFill>
      {rise > 0 && rise < 1 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: `radial-gradient(circle at 540px ${cy}px, rgba(183,216,197,0) ${R - 50}px, rgba(183,216,197,0.85) ${R - 4}px, rgba(222,137,87,0.25) ${R + 10}px, rgba(183,216,197,0) ${R + 70}px)`,
          }}
        />
      )}

      {/* Headline */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 262, textAlign: 'center'}}>
        {COPY.s6.headline.map((l, i) => (
          <RevealLine key={l} frame={f} at={832 + i * 8} outAt={S6_EXIT + i * 3}>
            <div style={headline(96, i === 2 ? C.teal : C.charcoal)}>{l}</div>
          </RevealLine>
        ))}
        <div
          style={{
            marginTop: 26,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 18,
            opacity: prog(f, 864, 16, E.soft) * (1 - exit),
            transform: `translateY(${(1 - prog(f, 864, 16, E.out)) * 18 - exit * 20}px)`,
          }}
        >
          <div style={{width: 64, height: 64, borderRadius: '50%', background: C.charcoal, display: 'grid', placeItems: 'center'}}>
            <span style={{...body(26, C.cream, 700)}}>
              M<span style={{color: C.mint}}>H</span>
            </span>
          </div>
          <span style={body(48, C.charcoal, 600)}>{COPY.s6.support}</span>
        </div>
      </div>

      {/* Spine */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - exit}}>
        <line x1={SPINE_X} y1={NODE_Y[0]} x2={SPINE_X} y2={NODE_Y[3]} stroke={C.creamLine} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" opacity={prog(f, 826, 10)} />
        <line x1={SPINE_X} y1={NODE_Y[0]} x2={SPINE_X} y2={lerp(NODE_Y[0], NODE_Y[3], lineP(f))} stroke={C.teal} strokeWidth={6} strokeLinecap="round" opacity={f >= ARRIVE[0] - 4 ? 1 : 0} />
      </svg>

      {/* Nodes, labels and stage actions */}
      {COPY.s6.steps.map((step, i) => {
        const act = prog(f, ARRIVE[i], 14, E.back);
        const label = prog(f, ARRIVE[i] - 6, 16, E.out);
        const out = prog(f, S6_EXIT + i * 2, 14, E.in);
        const arrived = f >= 826;
        return (
          <React.Fragment key={step}>
            {arrived && (
              <div
                style={{
                  position: 'absolute',
                  left: SPINE_X - NODE / 2,
                  top: NODE_Y[i] - NODE / 2,
                  width: NODE,
                  height: NODE,
                  borderRadius: '50%',
                  background: mix(act, C.paper, C.teal),
                  border: `3px solid ${C.teal}`,
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: shadow.creamCard,
                  opacity: 1 - out,
                  transform: `scale(${1 + act * 0.08 - out * 0.4})`,
                }}
              >
                <span style={{...body(30, mix(act, C.teal, C.cream), 700)}}>{i + 1}</span>
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                left: SPINE_X + 70,
                top: NODE_Y[i] - 34,
                ...headline(56, mix(label, C.muted, C.charcoal)),
                opacity: (0.35 + 0.65 * label) * prog(f, 828 + i * 3, 12, E.soft) * (1 - out),
                transform: `translateX(${(1 - label) * -16 - out * 30}px)`,
              }}
            >
              {step}
            </div>
            <Widget kind={i} f={f} at={ARRIVE[i]} out={out} y={NODE_Y[i]} />
          </React.Fragment>
        );
      })}

      {/* Travelling marker */}
      {f >= ARRIVE[0] - 6 && f < S6_EXIT + 2 && (
        <div
          style={{
            position: 'absolute',
            left: SPINE_X - 15,
            top: markerY(f) - 15,
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: C.teal,
            border: `4px solid ${C.cream}`,
            boxShadow: '0 0 0 8px rgba(183,216,197,0.6), 0 6px 18px rgba(23,97,90,0.45)',
            opacity: tw(f, ARRIVE[0] - 6, 6, 0, 1),
          }}
        />
      )}

      {/* Bridge: S5 blocks morph into the four nodes */}
      {f >= S5_HANDOFF && f < 830 && <GatherBridge f={f} />}
    </AbsoluteFill>
  );
};

const GatherBridge: React.FC<{f: number}> = ({f}) => {
  const rects = handoffRects();
  return (
    <>
      {rects.map((r, i) => {
        const p = prog(f, S5_HANDOFF + i * 3, 30, E.inOut);
        const shape = prog(f, S5_HANDOFF + i * 3, 18, E.inOut);
        const w = lerp(r.w, NODE, shape);
        const h = lerp(r.h, NODE, shape);
        // Curved path: horizontal motion leads, vertical follows.
        const x = lerp(r.cx, SPINE_X, prog(f, S5_HANDOFF + i * 3, 26, E.inOut));
        const y = lerp(r.cy, NODE_Y[i], p);
        const content = 1 - prog(f, S5_HANDOFF + i * 3, 10, E.soft);
        const r0 = i === 0 ? 34 : 24;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - w / 2,
              top: y - h / 2,
              width: w,
              height: h,
              borderRadius: lerp(r0, NODE / 2, shape),
              background: i === 0 ? mix(shape * 1.4, 'rgb(39,68,63)', C.paper) : C.paper,
              border: `${lerp(i === 0 ? 2 : 1.5, 3, shape)}px solid ${mix(shape * 1.6, i === 0 ? 'rgba(183,216,197,0.45)' : 'rgba(23,97,90,0.22)', C.teal)}`,
              boxShadow: shadow.creamCard,
              overflow: 'hidden',
            }}
          >
            {content > 0 && (
              <div style={{position: 'absolute', left: 0, top: 0, width: r.w, height: r.h, opacity: content}}>
                {i === 0 ? <QuestionBar text={COPY.s5.question} /> : <AnswerBlock kind={i - 1} f={f} docked={1} static />}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};

const WIDGET = {x: 620, w: 340, h: 150};

const Widget: React.FC<{kind: number; f: number; at: number; out: number; y: number}> = ({kind, f, at, out, y}) => {
  const show = prog(f, at - 8, 12, E.soft) * (1 - out);
  if (show <= 0) return null;
  const p = prog(f, at, 24, E.inOut);
  return (
    <div
      style={{
        position: 'absolute',
        left: WIDGET.x,
        top: y - WIDGET.h / 2,
        width: WIDGET.w,
        height: WIDGET.h,
        borderRadius: 26,
        background: C.paper,
        border: `1.5px solid ${C.creamLine}`,
        boxShadow: shadow.creamCard,
        opacity: show,
        transform: `translateX(${(1 - show) * 30 + out * 30}px)`,
        overflow: 'hidden',
      }}
    >
      {kind === 0 && <Understand f={f} p={p} />}
      {kind === 1 && <Prioritize p={p} />}
      {kind === 2 && <Improve f={f} at={at} p={p} />}
      {kind === 3 && <Refine f={f} at={at} p={p} />}
    </div>
  );
};

// 1 · research elements gather into an organised set
const Understand: React.FC<{f: number; p: number}> = ({p}) => {
  const icons: IconName[] = ['search', 'pin', 'page', 'chat', 'key'];
  return (
    <>
      {icons.map((ic, i) => {
        const sx = 30 + rand(i + 21) * 250;
        const sy = 14 + rand(i + 41) * 80;
        const tx = 26 + i * 60;
        const ty = 50;
        const pi = clamp01(p * 1.3 - i * 0.06);
        return (
          <div
            key={ic}
            style={{
              position: 'absolute',
              left: lerp(sx, tx, pi),
              top: lerp(sy, ty, pi),
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: mix((pi - 0.4) * 2.5, C.creamDeep, 'rgba(183,216,197,0.55)'),
              display: 'grid',
              placeItems: 'center',
              transform: `rotate(${(1 - pi) * (rand(i) * 40 - 20)}deg)`,
            }}
          >
            <Icon name={ic} size={28} color={mix((pi - 0.4) * 2.5, C.muted, C.teal)} />
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 26, right: 26, bottom: 18, height: 3, borderRadius: 2, background: C.teal, transformOrigin: 'left', transform: `scaleX(${p})`}} />
    </>
  );
};

// 2 · priorities align (reorder by importance)
const Prioritize: React.FC<{p: number}> = ({p}) => {
  const widths = [150, 250, 200];
  const from = [0, 1, 2];
  const to = [2, 0, 1]; // sorted by width (desc)
  return (
    <>
      {widths.map((w, i) => {
        const slot = lerp(from[i], to[i], p);
        const barColor = to[i] === 0 ? mix(p, 'rgba(25,43,42,0.12)', C.teal) : to[i] === 1 ? mix(p, 'rgba(25,43,42,0.12)', C.mint) : 'rgba(25,43,42,0.12)';
        return (
          <div key={i} style={{position: 'absolute', left: 24, top: 22 + slot * 38, display: 'flex', alignItems: 'center', gap: 12}}>
            <div style={{...body(20, to[i] === 0 ? mix(p, C.muted, C.cream) : C.muted, 700), width: 28, height: 28, borderRadius: '50%', background: to[i] === 0 ? mix(p, C.creamDeep, C.teal) : C.creamDeep, display: 'grid', placeItems: 'center'}}>
              {Math.round(slot) + 1}
            </div>
            <div style={{width: w, height: 18, borderRadius: 9, background: barColor}} />
          </div>
        );
      })}
    </>
  );
};

// 3 · a page element improves
const Improve: React.FC<{f: number; at: number; p: number}> = ({f, at, p}) => {
  const badge = prog(f, at + 16, 12, E.back);
  return (
    <>
      <div style={{position: 'absolute', left: 24, top: 24, width: 120, height: 100, borderRadius: 16, background: 'rgba(183,216,197,0.6)', transform: `scale(${p})`, transformOrigin: 'left top'}} />
      <div style={{position: 'absolute', left: lerp(40, 164, p), top: 30, transform: `rotate(${(1 - p) * -5}deg)`}}>
        <div style={{width: lerp(190, 140, p), height: 20, borderRadius: 10, background: mix(p, 'rgba(25,43,42,0.25)', C.teal)}} />
        <Bar w={lerp(120, 130, p)} h={11} style={{marginTop: 16}} />
        <Bar w={lerp(150, 100, p)} h={11} style={{marginTop: 10, transform: `translateX(${(1 - p) * 18}px)`}} />
      </div>
      <div style={{position: 'absolute', right: 16, bottom: 14, width: 40, height: 40, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center', transform: `scale(${badge})`}}>
        <Icon name="check" size={24} color={C.cream} stroke={3} />
      </div>
    </>
  );
};

// 4 · review, then a marker settles into place
const Refine: React.FC<{f: number; at: number; p: number}> = ({f, at, p}) => {
  const drop = prog(f, at + 10, 14, E.back);
  return (
    <>
      <div style={{position: 'absolute', left: 24, top: 30, transform: `rotate(${p * 360}deg)`}}>
        <Icon name="loop" size={44} color={C.teal} stroke={2.2} />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{position: 'absolute', left: 88, top: 32 + i * 32, display: 'flex', alignItems: 'center', gap: 10}}>
          <div style={{width: 18, height: 18, borderRadius: 6, border: `2px solid ${C.teal}`, background: p > 0.35 + i * 0.2 ? C.teal : 'transparent'}} />
          <Bar w={[150, 120, 136][i]} h={11} />
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          right: 22,
          top: lerp(-60, 46, drop),
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: C.accent,
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 8px 16px rgba(222,137,87,0.4)',
          opacity: drop > 0 ? 1 : 0,
        }}
      >
        <Icon name="check" size={28} color={C.cream} stroke={3} />
      </div>
      <div style={{position: 'absolute', right: 22, top: 104, width: 52, height: 6, borderRadius: 3, background: 'rgba(25,43,42,0.12)', transform: `scaleX(${kf(f, [at + 20, at + 26], [0.4, 1])})`}} />
    </>
  );
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
