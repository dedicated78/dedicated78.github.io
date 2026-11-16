import React from 'react';
import {AbsoluteFill} from 'remotion';

export type Cam = {
  /** World point the camera looks at. */
  x: number;
  y: number;
  /** Zoom (dolly) factor. */
  s: number;
  /** Screen point where the looked-at world point lands. Defaults to the same point. */
  fx?: number;
  fy?: number;
};

export const REST = (x = 540, y = 960): Cam => ({x, y, s: 1});

export const camTransform = (c: Cam) => {
  const fx = c.fx ?? c.x;
  const fy = c.fy ?? c.y;
  return `translate(${fx}px, ${fy}px) scale(${c.s}) translate(${-c.x}px, ${-c.y}px)`;
};

/**
 * A 3D stage. Children are absolutely positioned in 1080x1920 world space and keep
 * their own 3D transforms (preserve-3d). `depth` < 1 gives a slower parallax layer.
 */
export const Stage: React.FC<{
  cam?: Cam;
  depth?: number;
  perspective?: number;
  originY?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({cam = REST(), depth = 1, perspective = 2400, originY = 960, style, children}) => {
  const c: Cam = {...cam, s: 1 + (cam.s - 1) * depth};
  return (
    <AbsoluteFill style={{perspective: `${perspective}px`, perspectiveOrigin: `540px ${originY}px`, ...style}}>
      <AbsoluteFill style={{transformStyle: 'preserve-3d', transformOrigin: '0 0', transform: camTransform(c)}}>
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Absolutely positioned 3D plane, centred on (cx, cy). */
export const Plane: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  opacity?: number;
  blur?: number;
  origin?: string;
  preserve?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({cx, cy, w, h, z = 0, rx = 0, ry = 0, rz = 0, s = 1, opacity = 1, blur = 0, origin = '50% 50%', preserve, style, children}) => {
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        transformOrigin: origin,
        transform: `translate3d(0px, 0px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s})`,
        transformStyle: preserve ? 'preserve-3d' : undefined,
        opacity,
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        backfaceVisibility: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
};
