import React from 'react';
import {C} from '../theme';

/**
 * The circular search symbol that links the film together: search field icon (S1),
 * framing ring (S2), workflow marker (S6) and the closing reveal (S7).
 * Drawn centred on (x, y). `handle` 0..1 draws the magnifier handle.
 */
export const Lens: React.FC<{
  x: number;
  y: number;
  d: number;
  stroke: number;
  handle?: number;
  color?: string;
  halo?: number;
  fill?: string;
  opacity?: number;
}> = ({x, y, d, stroke, handle = 0, color = C.teal, halo = 0, fill, opacity = 1}) => {
  const r = d / 2;
  const hl = d * 0.42 * handle;
  const a = Math.PI / 4;
  const sx = r * Math.cos(a);
  const sy = r * Math.sin(a);
  const pad = stroke + hl + 4;
  const size = d + pad * 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        opacity,
        pointerEvents: 'none',
      }}
    >
      {halo > 0 && (
        <div
          style={{
            position: 'absolute',
            left: pad - d * 0.08,
            top: pad - d * 0.08,
            width: d * 1.16,
            height: d * 1.16,
            borderRadius: '50%',
            boxShadow: `0 0 ${40 + d * 0.08}px ${8 + d * 0.02}px rgba(183,216,197,${0.7 * halo}), inset 0 0 ${30 + d * 0.06}px rgba(183,216,197,${0.5 * halo})`,
          }}
        />
      )}
      <svg width={size} height={size} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <circle cx={size / 2} cy={size / 2} r={r} fill={fill ?? 'none'} stroke={color} strokeWidth={stroke} />
        {handle > 0.01 && (
          <line
            x1={size / 2 + sx}
            y1={size / 2 + sy}
            x2={size / 2 + sx + hl * Math.cos(a)}
            y2={size / 2 + sy + hl * Math.sin(a)}
            stroke={color}
            strokeWidth={stroke * 1.15}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
};
