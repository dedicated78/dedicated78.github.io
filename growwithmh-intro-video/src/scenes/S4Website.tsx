import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, FONT_TEXT} from '../theme';
import {B} from '../beats';
import {E, kf, lerp, mix, prog} from '../lib/anim';
import {CreamEnv} from '../components/Primitives';
import {Icon, IconName} from '../components/Icons';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, POSE0, Pose, mixPose} from '../components/Card3D';
import {H, KLine} from '../components/Faces';
import {CARD3, PERSPECTIVE, SITE4, SITE4_BLOCK, site4BlockScreen} from '../layout';
import {CARD3_REST, ProfileCard, ROTATE_START} from './S3Local';

// Scene 4 · bars 9–12 · 12.8–19.2 s · Website clarity
// The profile card turns edge-on (bar 8 beat 4) and comes round as a website while the
// light sweeps charcoal → cream. On bar 9 beat 3 the page separates into three layers
// (exploded view). The ring scans them on bar 10: structure aligns, content sharpens,
// links connect. On the bar-11 accent the layers slam back together. On the bar-12 snare
// the "What we do" block lifts forward and is carried into Scene 5.

const SWAP = B(9); // 384: edge-on, swap card for website
const EXPLODE = B(9, 3);
const SCAN = [B(10, 1, 1), B(10, 2, 1), B(10, 3, 1)]; // structure, content, links react
const REASSEMBLE = B(11);
export const LIFT = B(12, 2); // 540
export const LIFT_HANDOFF = B(12, 3, 2); // 558: Scene 5 draws the block from here

const REST: Pose = {...POSE0, rx: 3, ry: 5};
const EXPLODED: Pose = {...POSE0, y: 40, rx: 52, ry: 0, rz: -24, s: 0.74};
const GAP = 190;

const groupPose = (f: number): Pose => {
  if (f < SWAP) {
    const a = prog(f, ROTATE_START, SWAP - ROTATE_START, E.in);
    return mixPose({...CARD3_REST, y: CARD3.cy - SITE4.cy}, {...POSE0, y: (CARD3.cy - SITE4.cy) * 0.4, ry: -90}, a);
  }
  const b = prog(f, SWAP, 12, E.back);
  const arrive = mixPose({...POSE0, ry: 90, rx: 6}, REST, b);
  const ex = prog(f, EXPLODE, 12, E.out);
  const back = prog(f, REASSEMBLE - 4, 6, E.in);
  const exploded = mixPose(arrive, EXPLODED, ex * (1 - back));
  const recede = prog(f, LIFT + 6, 22, E.in);
  return mixPose(exploded, {...REST, z: -700, rx: 28, y: 140}, recede);
};
const gapAt = (f: number) => GAP * prog(f, EXPLODE, 12, E.out) * (1 - prog(f, REASSEMBLE - 4, 6, E.in)) + kf(f, [REASSEMBLE + 1, REASSEMBLE + 3, REASSEMBLE + 8], [0, 14, 0], E.soft);

/** Pose + size of the lifted "What we do" block (shared with Scene 5). */
export const liftedBlock = (f: number) => {
  const s = site4BlockScreen();
  const up = prog(f, LIFT, 8, E.out);
  const fly = prog(f, LIFT + 8, 22, E.in);
  return {
    cx: s.cx,
    cy: lerp(s.cy, 930, fly),
    w: lerp(s.w, 820, fly),
    h: lerp(s.h, 300, fly),
    pose: {...POSE0, y: -36 * up, z: 160 * up + 80 * fly, rx: lerp(3, -8, up) + 8 * fly, ry: lerp(5, -90, fly)} as Pose,
  };
};

export const S4Website: React.FC<{frame: number}> = ({frame: f}) => {
  const gp = groupPose(f);
  const gap = gapAt(f);
  const ex = prog(f, EXPLODE, 12, E.out) * (1 - prog(f, REASSEMBLE - 4, 6, E.in));
  const wipe = prog(f, ROTATE_START + 2, 14, E.inOut);
  const wipeMask = wipe >= 1 ? undefined : `linear-gradient(to left, black ${wipe * 130 - 25}%, transparent ${wipe * 130}%)`;
  const fade = 1 - prog(f, LIFT + 14, 14, E.soft);
  const scan = SCAN.map((t) => prog(f, t, 8, E.inOut));
  const flash = kf(f, [REASSEMBLE, REASSEMBLE + 1, REASSEMBLE + 7], [0, 1, 0], E.linear);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{maskImage: wipeMask, WebkitMaskImage: wipeMask}}>
        <CreamEnv haloY={1000} halo={1} lines={0.7} />
      </AbsoluteFill>
      {wipe > 0 && wipe < 1 && (
        <AbsoluteFill style={{background: `linear-gradient(to left, rgba(0,0,0,0) ${wipe * 130 - 30}%, rgba(183,216,197,0.7) ${wipe * 130 - 6}%, rgba(251,250,246,0.95) ${wipe * 130 - 1}%, rgba(0,0,0,0) ${wipe * 130 + 3}%)`, filter: 'blur(18px)'}} />
      )}

      <Stage perspective={PERSPECTIVE}>
        {f < SWAP ? (
          <Obj cx={SITE4.cx} cy={SITE4.cy} w={CARD3.w} h={CARD3.h} pose={gp}>
            <ProfileCard f={f} pose={gp} done />
          </Obj>
        ) : (
          <Obj cx={SITE4.cx} cy={SITE4.cy} w={SITE4.w} h={SITE4.h} pose={gp}>
            {/* Layer 1 · technical foundations (the slab with real thickness) */}
            <Card3D w={SITE4.w} h={SITE4.h} depth={26} radius={34} face={C.paper} edge={EDGE.paper} ry={gp.ry} lift={60 + ex * 120} shadowColor="25,43,42" opacity={fade} glow={flash > 0 ? `0 0 0 ${6 * flash}px rgba(23,97,90,0.5)` : undefined}>
              <Technical f={f} ex={ex} scan={scan[0]} />
            </Card3D>
            {/* Layer 2 · service content */}
            <div style={{position: 'absolute', inset: 0, transform: `translateZ(${gap + 1}px)`, opacity: fade}}>
              <Sheet ex={ex} tint="rgba(255,255,255,0.72)">
                <Content f={f} scan={scan[1]} hideBlock={f >= LIFT} />
              </Sheet>
            </div>
            {/* Layer 3 · internal connections */}
            <div style={{position: 'absolute', inset: 0, transform: `translateZ(${2 * gap + 2}px)`, opacity: fade}}>
              <Sheet ex={ex} tint="rgba(183,216,197,0.22)">
                <Connections f={f} scan={scan[2]} />
              </Sheet>
            </div>
          </Obj>
        )}
      </Stage>

      {/* The lifted block (until Scene 5 takes it) */}
      {f >= LIFT && f < LIFT_HANDOFF && <LiftedBlock f={f} />}

      {/* Layer labels in the exploded view */}
      {COPY.s4.layers.map((l, i) => {
        const p = prog(f, EXPLODE + 6 + i * 4, 8, E.back) * (1 - prog(f, REASSEMBLE - 6, 5, E.in));
        if (p <= 0) return null;
        const pos = LABELS[i];
        return (
          <div key={l} style={{position: 'absolute', left: pos.x, top: pos.y, transform: `translateX(${(1 - p) * (pos.side === 'r' ? 60 : -60)}px)`, opacity: Math.min(1, p * 2), display: 'flex', alignItems: 'center', gap: 12, flexDirection: pos.side === 'r' ? 'row' : 'row-reverse'}}>
            <div style={{width: 14, height: 14, borderRadius: '50%', background: C.teal, boxShadow: '0 0 0 6px rgba(23,97,90,0.18)'}} />
            <div style={{fontFamily: FONT_TEXT, fontWeight: 700, fontSize: 40, letterSpacing: '-0.015em', color: C.charcoal, padding: '12px 22px', borderRadius: 999, background: C.paper, border: `2px solid ${scan[i] > 0.5 ? C.teal : C.creamLine}`, boxShadow: '10px 20px 40px -18px rgba(25,43,42,0.45)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 12}}>
              {scan[i] > 0.5 && <Icon name="check" size={30} color={C.teal} stroke={3} />}
              {l}
            </div>
          </div>
        );
      })}

      {/* Headline */}
      <div style={{position: 'absolute', left: 40, right: 40, top: 240, height: 110, display: 'flex', justifyContent: 'center'}}>
        <div style={{position: 'absolute'}}>
          <KLine f={f} at={SWAP + 4} out={REASSEMBLE - 3}>
            <H size={86} color={C.charcoal}>
              Stronger <span style={{color: C.teal}}>foundations.</span>
            </H>
          </KLine>
        </div>
        <div style={{position: 'absolute'}}>
          <KLine f={f} at={REASSEMBLE} out={LIFT + 10}>
            <H size={86} color={C.charcoal}>
              Clearer <span style={{color: C.teal}}>services.</span>
            </H>
          </KLine>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Screen positions of the exploded-view labels (alternating sides of the stack).
const LABELS = [
  {x: 90, y: 1392, side: 'r'},
  {x: 470, y: 1180, side: 'r'},
  {x: 90, y: 560, side: 'r'},
] as const;

const Sheet: React.FC<{ex: number; tint: string; children: React.ReactNode}> = ({ex, tint, children}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: 34,
      background: ex > 0.01 ? tint : 'transparent',
      border: `2px solid rgba(23,97,90,${0.45 * ex})`,
      boxShadow: ex > 0.01 ? `0 30px 60px -30px rgba(25,43,42,${0.4 * ex})` : undefined,
    }}
  >
    {children}
  </div>
);

const Technical: React.FC<{f: number; ex: number; scan: number}> = ({ex, scan}) => {
  const boxes = [
    [24, 76, 712, 60],
    [24, 150, 712, 270],
    [24, 440, 712, 120],
    [24, 580, 712, 120],
    [24, 720, 712, 120],
    [24, 856, 712, 30],
  ];
  return (
    <>
      <div style={{height: 64, background: C.creamDeep, display: 'flex', alignItems: 'center', padding: '0 26px', gap: 10, borderBottom: `1.5px solid ${C.creamLine}`}}>
        {[C.accent, C.mint, 'rgba(97,113,106,0.4)'].map((c) => (
          <div key={c} style={{width: 15, height: 15, borderRadius: '50%', background: c}} />
        ))}
        <div style={{flex: 1, display: 'flex', justifyContent: 'center'}}>
          <div style={{fontFamily: FONT_TEXT, fontWeight: 500, fontSize: 24, color: C.muted, height: 40, padding: '0 22px', borderRadius: 20, background: C.paper, display: 'flex', alignItems: 'center', gap: 10}}>
            <Icon name="globe" size={22} color={C.teal} />
            {COPY.s4.url}
          </div>
        </div>
      </div>
      {boxes.map(([x, y, w, h], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: x + (1 - scan) * [0, 12, -16, 20, -10, 0][i],
            top: y,
            width: w,
            height: h,
            borderRadius: 14,
            border: `2.5px dashed ${mix(scan, 'rgba(222,137,87,0.65)', 'rgba(23,97,90,0.55)')}`,
            opacity: 0.25 + 0.75 * ex,
          }}
        />
      ))}
      {['<title>', '<h1>', 'meta', 'sitemap'].map((t, i) => {
        const p = prog(scan, 0.15 * i, 0.4);
        return (
          <div
            key={t}
            style={{
              position: 'absolute',
              left: 470 + (i % 2) * 130,
              top: 190 + Math.floor(i / 2) * 64,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: '"DejaVu Sans Mono", ui-monospace, monospace',
              fontWeight: 700,
              fontSize: 22,
              padding: '6px 12px',
              borderRadius: 10,
              color: mix(p, C.accent, C.teal),
              background: mix(p, 'rgba(222,137,87,0.12)', 'rgba(183,216,197,0.55)'),
              opacity: 0.3 + 0.7 * ex,
            }}
          >
            <span style={{display: 'inline-grid', width: 20 * p, overflow: 'hidden'}}>
              <Icon name="check" size={20} color={C.teal} stroke={3} />
            </span>
            {t}
          </div>
        );
      })}
    </>
  );
};

const Content: React.FC<{f: number; scan: number; hideBlock: boolean}> = ({scan, hideBlock}) => (
  <>
    <div style={{position: 'absolute', left: 40, top: 86, display: 'flex', alignItems: 'center', gap: 12}}>
      <div style={{width: 36, height: 36, borderRadius: 10, background: C.teal}} />
      <div style={{width: 120, height: 14, borderRadius: 7, background: 'rgba(25,43,42,0.75)'}} />
    </div>
    <div style={{position: 'absolute', right: 40, top: 92, display: 'flex', gap: 26, fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 22, color: C.muted}}>
      <span>Services</span>
      <span>About</span>
      <span>Contact</span>
    </div>
    <div style={{position: 'absolute', left: 40, top: 168, filter: scan < 0.98 ? `blur(${(1 - scan) * 5}px)` : undefined, transform: `translateX(${(1 - scan) * 18}px)`}}>
      <H size={56} color={mix(scan, 'rgba(25,43,42,0.45)', C.charcoal)} style={{lineHeight: 1.06}}>
        {COPY.s4.h1[0]}
        <br />
        {COPY.s4.h1[1]}
      </H>
    </div>
    <div style={{position: 'absolute', left: 40, top: 300, display: 'flex', flexDirection: 'column', gap: 12}}>
      <div style={{width: 360, height: 13, borderRadius: 7, background: 'rgba(25,43,42,0.12)'}} />
      <div style={{width: 280, height: 13, borderRadius: 7, background: 'rgba(25,43,42,0.12)'}} />
    </div>
    <div style={{position: 'absolute', left: 40, top: 352, height: 56, padding: '0 26px', borderRadius: 28, background: C.teal, display: 'flex', alignItems: 'center', gap: 10, fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 26, color: C.cream}}>
      {COPY.s4.cta}
      <Icon name="arrow" size={24} color={C.cream} />
    </div>
    <div style={{position: 'absolute', left: 470, top: 160, width: 250, height: 230, borderRadius: 22, background: 'linear-gradient(160deg, rgba(183,216,197,0.85), rgba(183,216,197,0.4))', display: 'grid', placeItems: 'center'}}>
      <Icon name="tools" size={92} color={C.teal} stroke={1.5} />
    </div>
    {COPY.s4.sections.map((t, i) => {
      if (i === 0 && hideBlock) return null;
      const off = (1 - scan) * [-26, 30, -18][i];
      return (
        <div key={t} style={{position: 'absolute', left: SITE4_BLOCK.x + off, top: SITE4_BLOCK.y + i * 140, width: SITE4_BLOCK.w, height: SITE4_BLOCK.h}}>
          <SectionBlock title={t} icon={(['list', 'pin', 'phone'] as IconName[])[i]} clear={scan} />
        </div>
      );
    })}
  </>
);

/** One service-page section (also the face of the block that lifts out). */
export const SectionBlock: React.FC<{title: string; icon: IconName; clear?: number; highlight?: number}> = ({title, icon, clear = 1, highlight = 0}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      borderRadius: 22,
      background: C.cream,
      border: `2px solid ${mix(highlight, mix(clear, C.creamLine, 'rgba(23,97,90,0.22)'), C.teal)}`,
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      padding: '0 26px',
    }}
  >
    <div style={{width: 64, height: 64, borderRadius: 18, background: mix(clear, 'rgba(25,43,42,0.12)', C.teal), display: 'grid', placeItems: 'center', flexShrink: 0}}>
      <Icon name={icon} size={34} color={C.cream} stroke={2} />
    </div>
    <div style={{flex: 1}}>
      <div style={{fontFamily: FONT_TEXT, fontWeight: 700, fontSize: 32, letterSpacing: '-0.015em', color: mix(clear, 'rgba(25,43,42,0.4)', C.charcoal), whiteSpace: 'nowrap'}}>{title}</div>
      <div style={{display: 'flex', gap: 10, marginTop: 12}}>
        <div style={{width: 230, height: 12, borderRadius: 6, background: 'rgba(25,43,42,0.12)'}} />
        <div style={{width: 150, height: 12, borderRadius: 6, background: 'rgba(25,43,42,0.12)'}} />
      </div>
    </div>
  </div>
);

const Connections: React.FC<{f: number; scan: number}> = ({scan}) => {
  const paths = [
    'M 560 104 C 640 160, 760 300, 700 500', // nav "Services" → What we do
    'M 155 408 C 120 560, 120 700, 60 780', // CTA → How to reach us
    'M 40 500 C 0 540, 0 600, 40 640', // What we do → Where we work
    'M 720 640 C 760 680, 760 740, 720 780', // Where we work → How to reach us
  ];
  return (
    <>
      <svg width={760} height={900} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={C.teal} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${prog(scan, i * 0.12, 0.6)} 1`} />
        ))}
      </svg>
      {[
        [690, 300],
        [110, 600],
        [10, 570],
        [750, 710],
      ].map(([x, y], i) => {
        const p = prog(scan, 0.35 + i * 0.1, 0.4);
        return (
          <div key={i} style={{position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, borderRadius: '50%', background: C.paper, border: `3px solid ${C.teal}`, display: 'grid', placeItems: 'center', transform: `scale(${p})`}}>
            <Icon name="link" size={24} color={C.teal} stroke={2.4} />
          </div>
        );
      })}
    </>
  );
};

/** The "What we do" block as a free 3D card (lift → fly → edge-on). */
export const LiftedBlock: React.FC<{f: number}> = ({f}) => {
  const b = liftedBlock(f);
  const hl = prog(f, LIFT - 2, 6, E.out);
  return (
    <Stage perspective={PERSPECTIVE}>
      <Obj cx={b.cx} cy={b.cy} w={b.w} h={b.h} pose={b.pose}>
        <Card3D w={b.w} h={b.h} depth={18} radius={24} face={C.cream} edge={EDGE.cream} ry={b.pose.ry} lift={70 + b.pose.z * 0.3} shadowColor="25,43,42" glow={`0 0 0 ${3 * hl}px ${C.teal}`}>
          <div style={{position: 'absolute', left: 0, top: 0, width: SITE4_BLOCK.w, height: SITE4_BLOCK.h}}>
            <SectionBlock title={COPY.s4.sections[0]} icon="list" highlight={hl} />
          </div>
        </Card3D>
      </Obj>
    </Stage>
  );
};
