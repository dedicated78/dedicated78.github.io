import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ringAt} from '../ring';
import {RING_CLICKS} from '../ring';
import {prog, E} from '../lib/anim';
import {Lens} from './Lens';

/** Draws the recurring search ring above every scene, plus a ripple on each click. */
export const RingLayer: React.FC<{frame: number}> = ({frame: f}) => {
  const r = ringAt(f);
  if (r.o <= 0.01) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {RING_CLICKS.map((c) => {
        const p = prog(f, c, 12, E.out);
        if (p <= 0 || p >= 1) return null;
        const d = r.d * (1 + p * 1.1);
        return (
          <div
            key={c}
            style={{
              position: 'absolute',
              left: r.x - d / 2,
              top: r.y - d / 2,
              width: d,
              height: d,
              borderRadius: '50%',
              border: `3px solid ${r.color}`,
              opacity: (1 - p) * 0.8 * r.o,
            }}
          />
        );
      })}
      <Lens x={r.x} y={r.y} d={r.d} stroke={r.sw} handle={r.h} color={r.color} halo={0.55 * (1 - r.collapse)} opacity={r.o} fill={r.collapse > 0.85 ? r.color : undefined} />
    </AbsoluteFill>
  );
};
