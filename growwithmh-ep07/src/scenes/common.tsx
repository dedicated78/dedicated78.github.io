import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {GroundShadow, Owner, OwnerPose} from '../chars/Owner';

export type Cam = {x: number; y: number; s: number; rx?: number; rz?: number; ty?: number};
export const CAM0: Cam = {x: 540, y: 960, s: 1};

/** A camera over a 1080x1920 world: (x, y) lands on screen centre, scaled by s, with optional tilt. */
export const World: React.FC<{cam: Cam; children: React.ReactNode; perspective?: number}> = ({cam, children, perspective = 1800}) => (
  <AbsoluteFill style={{perspective: `${perspective}px`, perspectiveOrigin: '540px 960px'}}>
    <AbsoluteFill
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: '0 0',
        transform: `translate(540px, ${960 + (cam.ty ?? 0)}px) rotateX(${cam.rx ?? 0}deg) rotateZ(${cam.rz ?? 0}deg) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Cream studio: warm ground, soft mint halo, a floor plane with a gentle horizon. */
export const Studio: React.FC<{haloX?: number; haloY?: number; floorY?: number; tint?: number}> = ({haloX = 540, haloY = 820, floorY = 1240, tint = 0}) => (
  <AbsoluteFill style={{background: C.cream}}>
    <AbsoluteFill style={{background: `radial-gradient(900px 760px at ${haloX}px ${haloY}px, rgba(183,216,197,0.55), rgba(183,216,197,0.12) 55%, rgba(183,216,197,0) 78%)`}} />
    <div style={{position: 'absolute', left: -400, right: -400, top: floorY, height: 2400, background: `linear-gradient(180deg, rgba(233,229,218,0.9), rgba(241,238,229,0.6) 35%, rgba(251,250,246,0))`}} />
    <div style={{position: 'absolute', left: -400, right: -400, top: floorY, height: 2, background: 'rgba(25,43,42,0.08)'}} />
    {tint > 0 && <AbsoluteFill style={{background: `rgba(23,97,90,${tint})`}} />}
  </AbsoluteFill>
);

/** Soft radial speed lines for dramatic beats (teal, low contrast). */
export const SpeedLines: React.FC<{o: number; x?: number; y?: number; t: number}> = ({o, x = 540, y = 760, t}) => {
  if (o <= 0) return null;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: o}}>
      {Array.from({length: 36}).map((_, i) => {
        const a = (i / 36) * Math.PI * 2 + Math.sin(i * 7.3) * 0.05;
        const r0 = 520 + ((i * 97 + Math.floor(t * 20) * 31) % 220);
        return <line key={i} x1={x + Math.cos(a) * r0} y1={y + Math.sin(a) * r0} x2={x + Math.cos(a) * 1600} y2={y + Math.sin(a) * 1600} stroke={i % 3 ? 'rgba(23,97,90,0.10)' : 'rgba(211,155,79,0.12)'} strokeWidth={i % 2 ? 10 : 22} />;
      })}
    </svg>
  );
};

/** Absolutely positioned box centred on (x, y). */
export const At: React.FC<{x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({x, y, w = 0, h = 0, style, children}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w || undefined, height: h || undefined, ...style}}>{children}</div>
);

/** The owner standing with his feet at (x, y) in world space, w px wide, with a contact shadow. */
export const OwnerAt: React.FC<{x: number; y: number; w: number; pose: OwnerPose; shadow?: boolean}> = ({x, y, w, pose, shadow = true}) => (
  <>
    {shadow && <GroundShadow x={x} y={y + 4} w={w * 0.62} lift={-pose.bob * (w / 400)} />}
    <div style={{position: 'absolute', left: x - w / 2, top: y - (700 / 400) * w}}>
      <Owner pose={pose} width={w} />
    </div>
  </>
);
