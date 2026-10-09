import React from 'react';
import {AbsoluteFill} from 'remotion';
import {COPY} from '../content';
import {C, FONT_TEXT} from '../theme';
import {B} from '../beats';
import {E, lerp, prog} from '../lib/anim';
import {CreamEnv} from '../components/Primitives';
import {Stage} from '../components/Stage';
import {Card3D, EDGE, Obj, enter} from '../components/Card3D';
import {AnswerMiniFace, KLine, MapFace, SiteMiniFace} from '../components/Faces';
import {Wordmark3D} from '../components/Wordmark3D';
import {PERSPECTIVE, S2_OBJ, WM2} from '../layout';
import {ringAt} from '../ring';

// Scene 2 · bars 3–4 · 3.2–6.4 s · Meet GrowwithMH
// The ring that rushed the camera opens onto cream; the extruded wordmark lands on the
// bar-3 impact, the founder line on the snare, then the map, website and answer objects
// arrive on kicks. The ring taps the map (bar 4 beat 3) and the camera dives into it (S3).

export const MAP_HANDOFF = B(4, 3); // 168: Scene 3 takes the map object from here

export const S2Brand: React.FC<{frame: number}> = ({frame: f}) => {
  const ring = ringAt(f);
  const iris = f < B(3, 1, 2) ? `circle(${Math.max(0, ring.d / 2 - ring.sw / 2)}px at ${ring.x}px ${ring.y}px)` : undefined;

  const land = prog(f, B(3) - 2, 9, E.back); // already visible on the impact frame
  const leave = prog(f, B(4, 3), 16, E.in);
  const wmRx = lerp(72, 0, land) - leave * 40;
  const wmRy = lerp(-10, 0, land) + lerp(-5, 5, prog(f, B(3, 1, 3), 60, E.inOutSoft));

  const objs = [
    {k: 'map', at: B(3, 3), from: {x: -220, y: 170, z: -560, rx: 28, ry: 34, rz: -8}, rest: {rx: 12, ry: 18, rz: -4}, exit: {x: 0, y: 0}},
    {k: 'site', at: B(3, 3, 3), from: {x: 220, y: 170, z: -560, rx: 22, ry: -34, rz: 8}, rest: {rx: 8, ry: -18, rz: 4}, exit: {x: 520, y: -60}},
    {k: 'answer', at: B(4), from: {y: 280, z: -560, rx: 46}, rest: {rx: 14}, exit: {x: 0, y: 520}},
  ] as const;

  return (
    <AbsoluteFill style={{clipPath: iris}}>
      <CreamEnv haloY={900} halo={1} lines={0.7} />

      {/* connection lines from the brand to the three areas of work */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 1 - leave}}>
        {Object.values(S2_OBJ).map((o, i) => {
          const p = prog(f, B(4, 2) + i * 2, 8, E.out);
          return (
            <line
              key={i}
              x1={540}
              y1={WM2.cy + 130}
              x2={lerp(540, o.cx, p)}
              y2={lerp(WM2.cy + 130, o.cy, p)}
              stroke={C.teal}
              strokeWidth={3}
              strokeDasharray="4 12"
              strokeLinecap="round"
              opacity={0.55}
            />
          );
        })}
      </svg>

      <Stage perspective={PERSPECTIVE}>
        <Wordmark3D
          size={WM2.size}
          cy={WM2.cy - leave * 220}
          rx={wmRx}
          ry={wmRy}
          s={lerp(1.22, 1, land)}
          ramp={['#A9CDB9', '#5E8F7E']}
          depth={18}
          opacity={Math.min(1, land * 3) * (1 - leave)}
        />
      </Stage>

      {objs.map((o) => {
        if (o.k === 'map' && f >= MAP_HANDOFF) return null;
        const L = S2_OBJ[o.k];
        const p = enter(f, o.at, o.from, o.rest, 10);
        const ex = o.k === 'map' ? 0 : prog(f, B(4, 3, 1), 14, E.in);
        const pose = {...p, x: p.x + o.exit.x * ex, y: p.y + o.exit.y * ex, z: p.z + ex * 200};
        const vis = f >= o.at;
        if (!vis) return null;
        return (
          <Stage key={o.k} perspective={PERSPECTIVE}>
            <Obj cx={L.cx} cy={L.cy} w={L.w} h={L.h} pose={pose}>
              <Card3D
                w={L.w}
                h={L.h}
                depth={18}
                radius={o.k === 'answer' ? 30 : 26}
                face={o.k === 'map' ? '#1E3533' : o.k === 'site' ? C.paper : C.cream}
                edge={o.k === 'map' ? EDGE.dark : EDGE.paper}
                border={o.k === 'map' ? '1.5px solid rgba(183,216,197,0.25)' : `1.5px solid ${C.creamLine}`}
                ry={pose.ry}
                lift={60}
                opacity={1 - ex}
              >
                {o.k === 'map' && <MapFace w={L.w} h={L.h} />}
                {o.k === 'site' && <SiteMiniFace />}
                {o.k === 'answer' && <AnswerMiniFace />}
              </Card3D>
            </Obj>
          </Stage>
        );
      })}

      {/* Founder line */}
      <div style={{position: 'absolute', left: 60, right: 60, top: WM2.cy + 108, display: 'flex', justifyContent: 'center', opacity: 1 - leave}}>
        <KLine f={f} at={B(3, 2)} out={B(4, 3, 1)}>
          <div style={{fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 50, letterSpacing: '-0.015em', color: C.muted, whiteSpace: 'nowrap'}}>
            {COPY.s2.by} <span style={{color: C.charcoal, fontWeight: 700}}>{COPY.s2.founder}</span>
          </div>
        </KLine>
      </div>
    </AbsoluteFill>
  );
};
