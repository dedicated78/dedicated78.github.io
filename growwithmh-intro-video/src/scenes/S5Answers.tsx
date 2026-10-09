import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, FONT_DISPLAY, FONT_TEXT} from '../theme';
import {B} from '../beats';
import {E, caretOn, lerp, mix, prog, typed} from '../lib/anim';
import {CreamEnv, DarkEnv} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, POSE0, Pose, enter, mixPose} from '../components/Card3D';
import {AnswerMiniFace, H, KLine, SiteMiniFace} from '../components/Faces';
import {ANS5, PERSPECTIVE, Q5, S6_OBJ, SRC5} from '../layout';
import {LIFT_HANDOFF, LiftedBlock} from './S4Website';

// Scene 5 · bars 13–15 · 19.2–24 s · Answers and AI search
// The lifted website block turns edge-on and comes round as the answer card while dark
// descends from the top. A question is typed; the source page arrives on the bar-13
// beat-3 kick and its information travels up into the answer (rows fill on 8ths). The
// ring runs down the answer and puts it in order (bar 14). "AEO + GEO" lands on the
// bar-14 snare. On bar 15 beat 3 the objects gather toward Scene 6.

export const TURN = B(12, 4, 2); // 570: block is edge-on
const Q_AT = B(13);
const TYPE = {start: B(13, 1, 2), fpc: 0.8};
const SRC_AT = B(13, 3);
const FILL = [B(13, 3, 2), B(13, 4), B(13, 4, 2)];
const ORDER = [B(14, 2), B(14, 2, 2), B(14, 3)];
export const GATHER = B(15, 3); // 696

export const S5Answers: React.FC<{frame: number}> = ({frame: f}) => {
  const dark = prog(f, LIFT_HANDOFF - 4, 16, E.inOut);
  const darkMask = dark >= 1 ? undefined : `linear-gradient(to bottom, black ${dark * 130 - 30}%, transparent ${dark * 130}%)`;
  const g = prog(f, GATHER, 22, E.inOut);
  const out = prog(f, GATHER, 10, E.in);

  // Answer card: comes round from edge-on, then shrinks into the Scene 6 answer object.
  const turn = prog(f, TURN, 12, E.back);
  const ansPose: Pose = mixPose({...POSE0, ry: 90, z: 240}, {...POSE0, rx: 3, ry: -3}, turn);
  const A = {
    cx: lerp(ANS5.cx, S6_OBJ.answer.cx, g),
    cy: lerp(ANS5.cy, S6_OBJ.answer.cy, g),
    w: lerp(ANS5.w, S6_OBJ.answer.w, g),
    h: lerp(lerp(300, ANS5.h, turn), S6_OBJ.answer.h, g),
  };
  const ansFinal = mixPose(ansPose, {...POSE0, rx: 8, ry: -14, rz: 3}, g);

  const qPose = enter(f, Q_AT, {x: 320, z: -520, ry: -28, rx: 10}, {rx: 3, ry: -4}, 10);
  const srcIn = enter(f, SRC_AT, {x: -320, y: 120, z: -520, ry: 34, rx: 20}, {rx: 8, ry: 16, rz: -3}, 10);
  const S = {
    cx: lerp(SRC5.cx, S6_OBJ.site.cx, g),
    cy: lerp(SRC5.cy, S6_OBJ.site.cy, g),
    w: lerp(SRC5.w, S6_OBJ.site.w, g),
    h: lerp(SRC5.h, S6_OBJ.site.h, g),
  };
  const srcPose = mixPose(srcIn, {...POSE0, rx: 6, ry: 0, z: -60}, g);

  const text = typed(COPY.s5.question, f, TYPE.start, TYPE.fpc);
  const typing = f >= TYPE.start && f < TYPE.start + COPY.s5.question.length * TYPE.fpc + 2;
  const flow = prog(f, SRC_AT + 2, 20, E.inOut);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{maskImage: darkMask, WebkitMaskImage: darkMask}}>
        <DarkEnv glowX={540} glowY={1000} glow={1} gridShiftY={-f * 0.6} gridOpacity={0.8} />
      </AbsoluteFill>

      {/* Cream horizon rises from below (dark → light) while the objects gather */}
      {g > 0 && (
        <AbsoluteFill style={{clipPath: `circle(2800px at 540px ${1920 + 2800 - g * 2200}px)`}}>
          <CreamEnv haloY={850} halo={1} lines={0.7} />
        </AbsoluteFill>
      )}
      {g > 0 && g < 1 && (
        <AbsoluteFill
          style={{
            pointerEvents: 'none',
            background: `radial-gradient(circle at 540px ${1920 + 2800 - g * 2200}px, rgba(183,216,197,0) 2750px, rgba(183,216,197,0.9) 2796px, rgba(222,137,87,0.25) 2810px, rgba(183,216,197,0) 2870px)`,
          }}
        />
      )}

      {f >= LIFT_HANDOFF && f < TURN && <LiftedBlock f={f} />}

      {/* information flowing from the source page into the answer */}
      {f >= SRC_AT && (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
          {[0, 1, 2].map((i) => {
            const x0 = SRC5.cx - 90 + i * 90;
            const y0 = SRC5.cy - SRC5.h / 2 + 10;
            const x1 = ANS5.cx - 250 + i * 250;
            const y1 = ANS5.cy + ANS5.h / 2 - 6;
            const d = `M ${x0} ${y0} C ${x0} ${y0 - 90}, ${x1} ${y1 + 90}, ${x1} ${y1}`;
            const p = prog(flow, i * 0.15, 0.55);
            const dot = prog(flow, 0.2 + i * 0.15, 0.6);
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={C.mint} strokeWidth={4} strokeLinecap="round" strokeDasharray={`${p} 1`} pathLength={1} opacity={0.75} />
                {dot > 0 && dot < 1 && (
                  <circle
                    r={9}
                    fill={C.mint}
                    style={
                      {offsetPath: `path('${d}')`, offsetDistance: `${dot * 100}%`, filter: 'drop-shadow(0 0 8px rgba(183,216,197,0.9))'} as React.CSSProperties
                    }
                  />
                )}
              </g>
            );
          })}
        </svg>
      )}

      {/* Each object gets its own 3D context: shared contexts let Chrome split planes. */}
      <Stage perspective={PERSPECTIVE}>
        {/* Source page */}
        {f >= SRC_AT && (
          <Obj cx={S.cx} cy={S.cy} w={S.w} h={S.h} pose={srcPose}>
            <Card3D
              w={S.w}
              h={S.h}
              depth={18}
              radius={26}
              face={C.paper}
              edge={EDGE.paper}
              ry={srcPose.ry}
              lift={60}
              shadowColor="0,0,0"
              glow="0 0 60px -20px rgba(183,216,197,0.6)"
            >
              <SiteMiniFace label={g < 0.3 ? COPY.s4.url : undefined} />
            </Card3D>
          </Obj>
        )}
      </Stage>
      <Stage perspective={PERSPECTIVE}>
        {/* Question */}
        {f >= Q_AT && (
          <Obj cx={Q5.cx} cy={Q5.cy - out * 80} w={Q5.w} h={Q5.h} pose={{...qPose, z: qPose.z - out * 300}}>
            <Card3D
              w={Q5.w}
              h={Q5.h}
              depth={16}
              radius={40}
              face="linear-gradient(165deg, rgba(48,84,78,0.98), rgba(31,54,51,0.98))"
              edge={EDGE.dark}
              border="2px solid rgba(183,216,197,0.45)"
              ry={qPose.ry}
              lift={50}
              opacity={1 - out}
            >
              <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 20, padding: '0 28px'}}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(183,216,197,0.18)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="chat" size={34} color={C.mint} />
                </div>
                <div
                  style={{fontFamily: FONT_TEXT, fontWeight: 500, fontSize: 40, color: C.cream, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center'}}
                >
                  {text}
                  {(typing || caretOn(f)) && f < SRC_AT + 4 && (
                    <span style={{width: 3, height: 46, marginLeft: 4, borderRadius: 2, background: C.mint, display: 'inline-block'}} />
                  )}
                </div>
              </div>
            </Card3D>
          </Obj>
        )}
      </Stage>
      <Stage perspective={PERSPECTIVE}>
        {/* Answer */}
        {f >= TURN && (
          <Obj cx={A.cx} cy={A.cy} w={A.w} h={A.h} pose={ansFinal}>
            <Card3D
              w={A.w}
              h={A.h}
              depth={22}
              radius={lerp(36, 26, g)}
              face={C.cream}
              edge={EDGE.cream}
              ry={ansFinal.ry}
              lift={70}
              shadowColor="0,0,0"
              glow="0 0 90px -20px rgba(23,97,90,0.8)"
              layers={[{key: 'head', z: 26, opacity: 1 - prog(g, 0, 0.4), node: <AnswerHeader />}]}
            >
              <div style={{position: 'absolute', inset: 0, opacity: 1 - prog(g, 0, 0.45)}}>
                {COPY.s5.rows.map((r, i) => (
                  <AnswerRow key={r} i={i} label={r} fill={prog(f, FILL[i], 6, E.out)} order={prog(f, ORDER[i], 6, E.back)} />
                ))}
              </div>
              <div style={{position: 'absolute', inset: 0, opacity: prog(g, 0.35, 0.5)}}>
                <AnswerMiniFace />
              </div>
            </Card3D>
          </Obj>
        )}
      </Stage>

      <SmallLabel f={f} at={SRC_AT + 4} x={SRC5.cx} y={SRC5.cy + SRC5.h / 2 + 40} out={out} text={COPY.s5.source} />
      <AeoGeo f={f} out={out} />

      {/* Headline: "Clear answers." → "Connected information." */}
      <div style={{position: 'absolute', left: 90, top: 250}}>
        <div style={{position: 'absolute', top: 0, left: 0}}>
          <KLine f={f} at={B(13) + 3} out={B(14, 3) - 3}>
            <H size={104} color={C.cream}>
              Clear <span style={{color: C.mint}}>answers.</span>
            </H>
          </KLine>
        </div>
        <div style={{position: 'absolute', top: 0, left: 0}}>
          <KLine f={f} at={B(14, 3)} out={GATHER}>
            <H size={96} color={C.cream}>
              {COPY.s5.b[0]}
            </H>
          </KLine>
          <KLine f={f} at={B(14, 3) + 3} out={GATHER + 2}>
            <H size={96} color={C.mint}>
              {COPY.s5.b[1]}
            </H>
          </KLine>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const AnswerHeader: React.FC = () => (
  <div style={{position: 'absolute', left: 36, top: 34, right: 36, display: 'flex', alignItems: 'center', gap: 18}}>
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: C.teal,
        display: 'grid',
        placeItems: 'center',
        boxShadow: '6px 12px 20px -8px rgba(0,0,0,0.35)',
      }}
    >
      <Icon name="spark" size={36} color={C.cream} />
    </div>
    <div style={{fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 40, letterSpacing: '-0.03em', color: C.charcoal}}>Answer</div>
    <div style={{flex: 1}} />
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: FONT_TEXT,
        fontWeight: 600,
        fontSize: 24,
        color: C.teal,
        padding: '8px 16px',
        borderRadius: 999,
        background: 'rgba(183,216,197,0.5)',
      }}
    >
      <Icon name="link" size={22} color={C.teal} stroke={2.4} />
      {COPY.s4.url}
    </div>
  </div>
);

const AnswerRow: React.FC<{i: number; label: string; fill: number; order: number}> = ({i, label, fill, order}) => {
  const off = (1 - order) * [24, -30, 18][i];
  return (
    <div
      style={{
        position: 'absolute',
        left: 30 + off,
        right: 30 - off,
        top: 132 + i * 92,
        height: 76,
        borderRadius: 18,
        background: mix(fill, 'rgba(25,43,42,0.04)', C.paper),
        border: `2px solid ${mix(order, 'rgba(25,43,42,0.08)', 'rgba(23,97,90,0.3)')}`,
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '0 20px',
        opacity: 0.4 + 0.6 * fill,
      }}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          background: mix(fill, 'rgba(25,43,42,0.12)', C.teal),
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={(['list', 'pin', 'phone'] as IconName[])[i]} size={26} color={C.cream} stroke={2} />
      </div>
      <div style={{fontFamily: FONT_TEXT, fontWeight: 700, fontSize: 30, color: C.charcoal, width: 250, whiteSpace: 'nowrap', opacity: fill}}>{label}</div>
      <div style={{flex: 1, height: 16, borderRadius: 8, background: C.mint, transformOrigin: 'left', transform: `scaleX(${fill})`}} />
      <div style={{width: 40 * order, overflow: 'hidden', display: 'grid', placeItems: 'center'}}>
        <Icon name="check" size={32} color={C.teal} stroke={3} />
      </div>
    </div>
  );
};

const SmallLabel: React.FC<{f: number; at: number; x: number; y: number; out: number; text: string}> = ({f, at, x, y, out, text}) => {
  const p = prog(f, at, 8, E.back);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.8 + 0.2 * p})`,
        opacity: Math.min(1, p * 2) * (1 - out),
        fontFamily: FONT_TEXT,
        fontWeight: 600,
        fontSize: 30,
        color: C.mintText,
        padding: '8px 18px',
        borderRadius: 999,
        border: '1.5px solid rgba(183,216,197,0.45)',
        background: 'rgba(25,43,42,0.85)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

const AeoGeo: React.FC<{f: number; out: number}> = ({f, out}) => {
  const p = prog(f, B(14, 4), 8, E.back);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: 560,
        top: 1268,
        opacity: Math.min(1, p * 2) * (1 - out),
        transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + 0.2 * p})`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 700,
          fontSize: 64,
          letterSpacing: '-0.03em',
          color: C.charcoal,
          padding: '18px 34px',
          borderRadius: 999,
          background: C.mint,
          boxShadow: '0 20px 50px -16px rgba(0,0,0,0.6), 0 0 50px -10px rgba(183,216,197,0.6)',
          whiteSpace: 'nowrap',
        }}
      >
        AEO <span style={{color: C.teal}}>+</span> GEO
      </div>
      <div
        style={{
          marginTop: 14,
          fontFamily: FONT_TEXT,
          fontWeight: 600,
          fontSize: 30,
          color: C.mintText,
          opacity: prog(f, B(14, 4) + 4, 8),
          whiteSpace: 'nowrap',
        }}
      >
        answer engines &amp; AI search
      </div>
    </div>
  );
};
