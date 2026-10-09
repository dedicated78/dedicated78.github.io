import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, shadow} from '../theme';
import {E, caretOn, kf, lerp, prog, tw, typed} from '../lib/anim';
import {Cursor, DarkEnv, RevealLine, body, headline} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Plane, Stage} from '../components/Stage';
import {LIFT_HANDOFF, SERVICES_SCREEN, ServicesBlock} from './S4Website';

// Scene 5 · 21–27s · Search is evolving
// Bridge in: the lifted services block flies up while dark descends from the top.
// A question is typed, the camera pulls back and an organised answer assembles from
// clear content blocks. Bridge out: blocks gather into workflow nodes (S6).

export const Q = {cx: 540, cy: 590, w: 800, h: 116};
export const ANSWER = {cx: 540, cy: 975, w: 840, h: 600};
// Answer block slots, in answer-panel local coordinates.
export const SLOTS = [
  {y: 92, h: 168},
  {y: 276, h: 150},
  {y: 442, h: 138},
];
/** Screen rects of the question bar and the three blocks when S6 takes over. */
export const S5_HANDOFF = 792;
export const handoffRects = () => [
  {cx: Q.cx, cy: Q.cy, w: Q.w, h: Q.h},
  ...SLOTS.map((s) => ({cx: ANSWER.cx, cy: ANSWER.cy - ANSWER.h / 2 + s.y + s.h / 2, w: ANSWER.w - 56, h: s.h})),
];

const TYPE_START = 650;
const FPC = 1.34;
const SUBMIT = 688;

export const S5Answers: React.FC<{frame: number}> = ({frame: f}) => {
  // Dark descends from the top as the block lifts.
  const dark = prog(f, 604, 28, E.inOut);
  const darkMask = dark >= 1 ? undefined : `linear-gradient(to bottom, black ${dark * 130 - 30}%, transparent ${dark * 130}%)`;

  // Camera: drift up to the question bar, then pull back to reveal the answer.
  const inQ = prog(f, LIFT_HANDOFF, 40, E.inOut);
  const out = prog(f, 690, 28, E.inOut);
  const camY = lerp(lerp(960, Q.cy, inQ), 960, out);
  const camS = lerp(lerp(1, 1.12, inQ), 1, out);

  const gather = f >= S5_HANDOFF; // S6 owns the morph from here
  const exitTxt = prog(f, 786, 12, E.in);
  // Panel surfaces fade as their contents leave as workflow nodes (S6 bridge).
  const panelFade = 1 - prog(f, S5_HANDOFF, 10, E.soft);

  const qIn = prog(f, 632, 18, E.out);
  const text = typed(COPY.s5.question, f, TYPE_START, FPC);
  const typing = f >= TYPE_START && f < TYPE_START + COPY.s5.question.length * FPC + 2;
  const press = kf(f, [SUBMIT - 2, SUBMIT, SUBMIT + 4], [0, 1, 0], E.soft);

  const ans = prog(f, 692, 22, E.out);
  const stack = [prog(f, 636, 20, E.out), prog(f, 642, 20, E.out)];

  // Lifted block: from the website's services rect to a waiting spot, then into slot 1.
  const fly = prog(f, LIFT_HANDOFF, 34, E.inOut);
  const dock = prog(f, 696, 20, E.inOut);
  const wait = {cx: 540, cy: 840, w: 700, h: 150};
  const slot1 = {cx: ANSWER.cx, cy: ANSWER.cy - ANSWER.h / 2 + SLOTS[0].y + SLOTS[0].h / 2, w: ANSWER.w - 56, h: SLOTS[0].h};
  const blk = {
    cx: lerp(lerp(SERVICES_SCREEN.cx, wait.cx, fly), slot1.cx, dock),
    cy: lerp(lerp(SERVICES_SCREEN.cy, wait.cy, fly), slot1.cy, dock),
    w: lerp(lerp(SERVICES_SCREEN.w, wait.w, fly), slot1.w, dock),
    h: lerp(lerp(SERVICES_SCREEN.h, wait.h, fly), slot1.h, dock),
  };
  const blkZ = lerp(lerp(0, -140, fly), 0, dock) + kf(f, [LIFT_HANDOFF, LIFT_HANDOFF + 8, LIFT_HANDOFF + 30], [0, 120, 0], E.inOut);
  const morph = prog(f, LIFT_HANDOFF + 10, 16, E.inOut);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{maskImage: darkMask, WebkitMaskImage: darkMask}}>
        <DarkEnv glowX={540} glowY={lerp(700, 960, out)} glow={1} gridShiftY={-f * 0.25} />
      </AbsoluteFill>

      <Stage cam={{x: 540, y: camY, s: camS}}>
        {f < S5_HANDOFF + 12 && (
          <>
            {/* Stacked panels behind the answer */}
            {[2, 1].map((k) => (
              <Plane
                key={k}
                cx={ANSWER.cx}
                cy={ANSWER.cy - k * 46 - (1 - stack[k - 1]) * 60}
                w={ANSWER.w - k * 70}
                h={ANSWER.h}
                z={-k * 120}
                rx={4}
                opacity={stack[k - 1] * (k === 1 ? 0.75 : 0.45) * panelFade}
                blur={k * 1.2}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 34,
                    background: 'linear-gradient(170deg, rgba(39,68,63,0.95), rgba(28,48,46,0.9))',
                    border: '1.5px solid rgba(183,216,197,0.2)',
                    boxShadow: shadow.darkPanel,
                  }}
                />
              </Plane>
            ))}

          </>
        )}
      </Stage>

      {/* Answer panel + question in their own 3D context so the rising panel never cuts through the stack */}
      <Stage cam={{x: 540, y: camY, s: camS}}>
        {f < S5_HANDOFF + 12 && (
          <>
            {/* Answer panel */}
            <Plane
              cx={ANSWER.cx}
              cy={ANSWER.cy + (1 - ans) * 70}
              w={ANSWER.w}
              h={ANSWER.h}
              z={(1 - ans) * -260}
              rx={lerp(12, 3, ans)}
              opacity={ans * panelFade}
            >
              <AnswerPanel f={f} hideBlocks={gather} />
            </Plane>

            {/* Question bar */}
            {!gather && (
              <Plane cx={Q.cx} cy={Q.cy} w={Q.w} h={Q.h} z={(1 - qIn) * -300} rx={lerp(14, 4, qIn) + out * -2} opacity={qIn}>
                <QuestionBar text={text} caret={(typing || (caretOn(f) && f < SUBMIT)) && f >= 646} press={press} />
              </Plane>
            )}
          </>
        )}
      </Stage>

      {/* The block carried from the website (own 3D context: always in front of the panels) */}
      <Stage cam={{x: 540, y: camY, s: camS}}>
        {f >= LIFT_HANDOFF && !gather && (
          <Plane
            cx={blk.cx}
            cy={blk.cy}
            w={blk.w}
            h={blk.h}
            z={blkZ}
            rx={lerp(2, 0, fly)}
            blur={(fly - dock) * 1.6 * (1 - dock)}
            style={{borderRadius: 24, background: C.paper}}
          >
            <div style={{position: 'absolute', inset: 0, opacity: 1 - morph}}>
              <div
                style={{
                  width: SERVICES_SCREEN.w,
                  height: SERVICES_SCREEN.h,
                  transformOrigin: '0 0',
                  transform: `scale(${blk.w / SERVICES_SCREEN.w}, ${blk.h / SERVICES_SCREEN.h})`,
                }}
              >
                <ServicesBlock svc={1} lift={1} />
              </div>
            </div>
            <div style={{position: 'absolute', inset: 0, opacity: morph}}>
              <AnswerBlock kind={0} f={f} docked={dock} />
            </div>
          </Plane>
        )}
      </Stage>

      {/* Cursor submits the question (screen space) */}
      {(() => {
        const btn = {x: 540 + (Q.cx + Q.w / 2 - 60 - 540) * 1.12, y: Q.cy};
        const o = tw(f, 668, 8, 0, 1) * (1 - prog(f, SUBMIT + 6, 8, E.soft));
        if (o <= 0) return null;
        return (
          <Cursor
            x={kf(f, [668, SUBMIT - 2], [btn.x + 40, btn.x - 8], E.out)}
            y={kf(f, [668, SUBMIT - 2], [btn.y + 260, btn.y + 6], E.out)}
            opacity={o}
            press={press}
          />
        );
      })()}

      {/* Headline + SEO/AEO/GEO grouping */}
      <div style={{position: 'absolute', left: 90, right: 90, top: 262, textAlign: 'center'}}>
        <RevealLine frame={f} at={722} outAt={786}>
          <div style={headline(90, C.cream)}>{COPY.s5.headline[0]}</div>
        </RevealLine>
        <RevealLine frame={f} at={728} outAt={789}>
          <div style={headline(90, C.mint)}>{COPY.s5.headline[1]}</div>
        </RevealLine>
      </div>
      <div style={{position: 'absolute', left: 90, right: 90, top: 1318, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18}}>
        {COPY.s5.stack.map((s, i) => {
          const p = prog(f, 746 + i * 6, 16, E.back);
          const plus = prog(f, 750 + i * 6, 12, E.out);
          return (
            <React.Fragment key={s}>
              {i > 0 && <div style={{...headline(60, C.mint), opacity: plus * (1 - exitTxt)}}>+</div>}
              <div
                style={{
                  ...headline(64, i === 0 ? C.charcoal : C.cream),
                  padding: '16px 34px',
                  borderRadius: 999,
                  background: i === 0 ? C.mint : 'rgba(183,216,197,0.08)',
                  border: `2.5px solid ${C.mint}`,
                  opacity: p * (1 - exitTxt),
                  transform: `scale(${0.8 + 0.2 * p}) translateY(${exitTxt * -20}px)`,
                }}
              >
                {s}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** The question input, also drawn by Scene 6's bridge at hand-off. */
export const QuestionBar: React.FC<{text: string; caret?: boolean; press?: number}> = ({text, caret = false, press = 0}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 34,
      background: 'linear-gradient(170deg, rgba(43,76,71,0.96), rgba(31,54,51,0.96))',
      border: '2px solid rgba(183,216,197,0.45)',
      boxShadow: `${shadow.darkPanel}, 0 0 0 ${press * 8}px rgba(183,216,197,0.18)`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 22px 0 26px',
      gap: 20,
    }}
  >
    <div style={{width: 60, height: 60, borderRadius: '50%', background: 'rgba(183,216,197,0.16)', display: 'grid', placeItems: 'center', flexShrink: 0}}>
      <Icon name="chat" size={32} color={C.mint} />
    </div>
    <div style={{...body(40, C.cream, 500), flex: 1, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center'}}>
      {text}
      {caret && <span style={{display: 'inline-block', width: 3, height: 46, marginLeft: 4, background: C.mint, borderRadius: 2}} />}
    </div>
    <div
      style={{
        width: 76,
        height: 76,
        borderRadius: 24,
        background: C.mint,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        transform: `scale(${1 - press * 0.1})`,
      }}
    >
      <Icon name="arrow" size={36} color={C.charcoal} stroke={2.4} />
    </div>
  </div>
);

const AnswerPanel: React.FC<{f: number; hideBlocks?: boolean}> = ({f, hideBlocks = false}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      borderRadius: 36,
      background: C.cream,
      boxShadow: shadow.creamOnDark,
      padding: '0 28px',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div style={{height: 78, display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1.5px solid ${C.creamLine}`}}>
      <div style={{width: 48, height: 48, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
        <Icon name="spark" size={28} color={C.cream} />
      </div>
      <div style={body(30, C.charcoal, 700)}>Answer</div>
      <div style={{flex: 1}} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: C.mint,
            opacity: 0.4 + 0.6 * (Math.floor(f / 6 + i) % 3 === 0 ? 1 : 0) * (f < 716 ? 1 : 0),
          }}
        />
      ))}
    </div>
    {!hideBlocks &&
      [1, 2].map((k) => (
        <div key={k} style={{position: 'absolute', left: 28, right: 28, top: SLOTS[k].y, height: SLOTS[k].h}}>
          <AnswerBlock kind={k} f={f} docked={1} />
        </div>
      ))}
  </div>
);

const TAG_ICON: IconName[] = ['page', 'chat', 'list'];

/** One of the three answer blocks: 0 = useful content, 1 = clear answer, 2 = structured info. */
export const AnswerBlock: React.FC<{kind: number; f: number; docked: number; static?: boolean}> = ({kind, f, docked, static: still}) => {
  const start = [700, 712, 724][kind];
  const tag = still ? 1 : prog(f, start + 6, 14, E.back);
  const content = still ? 1 : kind === 0 ? 1 : prog(f, start, 18, E.out);
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: 24,
        background: kind === 0 ? C.paper : 'rgba(255,255,255,0.7)',
        border: `1.5px solid ${docked > 0.5 ? 'rgba(23,97,90,0.22)' : C.creamLine}`,
        boxShadow: kind === 0 ? `0 ${16 * (1 - docked)}px 40px -12px rgba(0,0,0,${0.5 * (1 - docked)})` : undefined,
        padding: '16px 22px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          ...body(26, C.teal, 700),
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px 6px 10px',
          borderRadius: 999,
          background: 'rgba(183,216,197,0.6)',
          transform: `scale(${0.6 + 0.4 * tag})`,
          transformOrigin: 'left center',
          opacity: tag,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        <Icon name={TAG_ICON[kind]} size={24} color={C.teal} stroke={2.2} />
        {COPY.s5.labels[kind]}
      </div>
      <div style={{marginTop: 14, opacity: content, transform: `translateY(${(1 - content) * 12}px)`}}>
        {kind === 0 && (
          <div style={{display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap'}}>
            <div style={{...body(30, C.charcoal, 700), marginRight: 6, whiteSpace: 'nowrap'}}>{COPY.s5.blockTitle}</div>
            {COPY.s4.services.map((s) => (
              <div
                key={s}
                style={{...body(26, C.teal, 600), padding: '8px 16px', borderRadius: 999, background: 'rgba(183,216,197,0.45)', whiteSpace: 'nowrap'}}
              >
                {s}
              </div>
            ))}
          </div>
        )}
        {kind === 1 && (
          <div style={{...body(32, C.charcoal, 500), lineHeight: 1.3}}>
            Repairs, installations and maintenance
            <br />
            for customers nearby.
          </div>
        )}
        {kind === 2 && (
          <div style={{display: 'flex', gap: 14}}>
            {COPY.s5.facts.map(([k, v], i) => {
              const p = still ? 1 : prog(f, start + 4 + i * 4, 12, E.out);
              return (
                <div
                  key={k}
                  style={{flex: 1, padding: '8px 14px', borderRadius: 14, background: C.creamDeep, opacity: p, transform: `translateY(${(1 - p) * 10}px)`}}
                >
                  <div style={body(20, C.muted, 600)}>{k}</div>
                  <div style={{...body(25, C.charcoal, 700), whiteSpace: 'nowrap'}}>{v}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
