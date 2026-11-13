import React from 'react';
import {E, lerp, prog} from '../lib/anim';

// Dimensional cards. A card is a front face, a stack of edge slices behind it (real
// thickness you can see when it turns), a contact shadow, a moving specular sheen and
// optional internal layers floating at different depths above the face.
//
// CSS flattens any element with opacity < 1, filter or overflow:hidden that also has
// preserve-3d, so fades are applied to the leaf faces, never to the 3D containers.

export type Pose = {x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number};
export const POSE0: Pose = {x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1};

/** Absolutely positioned 3D object centred on (cx, cy) with a pose. Never fades itself. */
export const Obj: React.FC<{cx: number; cy: number; w: number; h: number; pose?: Partial<Pose>; origin?: string; children: React.ReactNode}> = ({
  cx,
  cy,
  w,
  h,
  pose = {},
  origin = '50% 50%',
  children,
}) => {
  const p = {...POSE0, ...pose};
  return (
    <div
      style={{
        position: 'absolute',
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        transformStyle: 'preserve-3d',
        transformOrigin: origin,
        transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg) scale(${p.s})`,
      }}
    >
      {children}
    </div>
  );
};

export type Layer = {z: number; node: React.ReactNode; key: string; opacity?: number};

export const Card3D: React.FC<{
  w: number;
  h: number;
  depth?: number;
  radius?: number;
  face: string;
  edge: [light: string, mid: string, dark: string];
  border?: string;
  opacity?: number;
  /** 0..1 strength of the moving specular sheen. */
  gloss?: number;
  /** Current Y rotation, drives where the sheen sits. */
  ry?: number;
  /** Height above the surface behind; moves and softens the contact shadow. */
  lift?: number;
  shadow?: number;
  shadowColor?: string;
  glow?: string;
  /** Spacing of edge slices; larger for very big planes. */
  step?: number;
  children?: React.ReactNode;
  layers?: Layer[];
}> = ({w, h, depth = 18, radius = 30, face, edge, border, opacity = 1, gloss = 0.5, ry = 0, lift = 40, shadow = 1, shadowColor = '15,29,28', glow, step = 1.6, children, layers = []}) => {
  if (opacity <= 0.002) return null;
  const slices = Math.max(2, Math.round(depth / step));
  const sheen = 18 + ry * 1.8;
  return (
    <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d'}}>
      {shadow > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            background: `rgba(${shadowColor},${0.5 * shadow})`,
            filter: `blur(${10 + lift * 0.35}px)`,
            transform: `translate3d(${lift * 0.35}px, ${lift * 0.75}px, ${-depth - 6 - lift * 0.6}px) scale(${0.97 - lift * 0.0006})`,
            opacity: opacity * Math.max(0.25, 1 - lift / 400),
          }}
        />
      )}
      {Array.from({length: slices}).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            background: `linear-gradient(155deg, ${edge[0]} 0%, ${edge[1]} 45%, ${edge[2]} 100%)`,
            transform: `translateZ(${-(i + 1) * step}px)`,
            opacity,
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: radius,
          background: face,
          border,
          overflow: 'hidden',
          transform: 'translateZ(0.6px)',
          opacity,
          boxShadow: glow,
        }}
      >
        {children}
        {gloss > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background: `linear-gradient(112deg, rgba(255,255,255,0) ${sheen}%, rgba(255,255,255,${0.32 * gloss}) ${sheen + 9}%, rgba(255,255,255,0) ${sheen + 22}%)`,
              mixBlendMode: 'soft-light',
            }}
          />
        )}
        {/* top-left key light along the bevel */}
        <div style={{position: 'absolute', inset: 0, borderRadius: radius, pointerEvents: 'none', boxShadow: 'inset 1.5px 2px 0 rgba(255,255,255,0.35), inset -1px -2px 0 rgba(0,0,0,0.08)'}} />
      </div>
      {layers.map((l) => (
        <div key={l.key} style={{position: 'absolute', inset: 0, transform: `translateZ(${l.z}px)`, opacity: opacity * (l.opacity ?? 1), pointerEvents: 'none'}}>
          {l.node}
        </div>
      ))}
    </div>
  );
};

/** Standard edge palettes. */
export const EDGE = {
  cream: ['#E9E5DA', '#D9D3C4', '#BDB5A3'] as [string, string, string],
  paper: ['#ECE9E1', '#DCD8CC', '#C3BCAB'] as [string, string, string],
  dark: ['#2E4A46', '#1F3532', '#0F1D1C'] as [string, string, string],
  teal: ['#2A8077', '#17615A', '#0E423D'] as [string, string, string],
  mint: ['#CFE5D8', '#B7D8C5', '#8FB9A2'] as [string, string, string],
};

/**
 * Entrance pose: starts behind the focal plane, offset diagonally and turned away,
 * then moves forward while rotating toward camera and settles with a small overshoot.
 */
export const enter = (f: number, at: number, from: Partial<Pose>, rest: Partial<Pose> = {}, dur = 10): Pose => {
  const p = prog(f, at, dur, E.back);
  const a = {...POSE0, ...from};
  const r = {...POSE0, ...rest};
  return {
    x: lerp(a.x + r.x, r.x, p),
    y: lerp(a.y + r.y, r.y, p),
    z: lerp(a.z + r.z, r.z, p),
    rx: lerp(a.rx + r.rx, r.rx, p),
    ry: lerp(a.ry + r.ry, r.ry, p),
    rz: lerp(a.rz + r.rz, r.rz, p),
    s: lerp(from.s ?? r.s, r.s, p),
  };
};

/** Blend two poses. */
export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
  rx: lerp(a.rx, b.rx, t),
  ry: lerp(a.ry, b.ry, t),
  rz: lerp(a.rz, b.rz, t),
  s: lerp(a.s, b.s, t),
});
