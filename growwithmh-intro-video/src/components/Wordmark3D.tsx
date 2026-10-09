import React from 'react';
import {interpolateColors} from 'remotion';
import {Wordmark} from './Primitives';

/**
 * Extruded GrowwithMH wordmark: the real typographic mark in front, with depth slices
 * behind it in a single colour ramp, so it has visible thickness when it turns.
 * Must sit inside a Stage (perspective). Centred horizontally on the frame.
 */
export const Wordmark3D: React.FC<{
  size: number;
  cy: number;
  dark?: boolean;
  depth?: number;
  rx?: number;
  ry?: number;
  s?: number;
  z?: number;
  ramp: [string, string];
  opacity?: number;
  dotScale?: number;
  dotOpacity?: number;
  clipRight?: number;
}> = ({size, cy, dark = false, depth = 16, rx = 0, ry = 0, s = 1, z = 0, ramp, opacity = 1, dotScale = 1, dotOpacity = 1, clipRight}) => {
  const n = Math.round(depth / 1.4);
  const clip = clipRight === undefined ? undefined : `inset(-40% ${clipRight}px -40% -10%)`;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: cy - size * 0.6, height: size * 1.2, display: 'flex', justifyContent: 'center', alignItems: 'center', transformStyle: 'preserve-3d'}}>
      <div style={{position: 'relative', transformStyle: 'preserve-3d', transform: `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`}}>
        {Array.from({length: n}).map((_, i) => (
          <div key={i} style={{position: 'absolute', left: 0, top: 0, transform: `translateZ(${-(i + 1) * 1.4}px)`, opacity, clipPath: clip}}>
            <Wordmark size={size} mono={interpolateColors(i / Math.max(1, n - 1), [0, 1], ramp)} dotScale={dotScale} dotOpacity={dotOpacity} />
          </div>
        ))}
        <div style={{position: 'relative', opacity, clipPath: clip}}>
          <Wordmark size={size} dark={dark} dotScale={dotScale} dotOpacity={dotOpacity} />
        </div>
      </div>
    </div>
  );
};
