import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Obj} from '../components/Card3D';
import {LOCALMAP, LocalSearchMap} from '../props/Ep03Props';
import {OrganicPanel, PaidPanel, PANEL} from '../props/Ep05Props';
import {Studio, World} from './common';

// Paid ads vs organic local rankings (narrator). Two clearly distinct panels; then the organic factors
// over an example map. No claim that ads improve organic rank, and no guaranteed ad position.
export const Lesson5: React.FC<{t: number}> = ({t}) => {
  const enter = pr(t, Q.L09e + 0.45, 0.6, EZ.out);
  const paidIn = pr(t, Q.L10 - 0.1, 0.5, EZ.back);
  const paidOut = pr(t, Q.L12 - 0.35, 0.45, EZ.in);
  const orgIn = pr(t, Q.L11 - 0.15, 0.5, EZ.back);
  const mapIn = pr(t, Q.L12 - 0.2, 0.55, EZ.back);
  const exit = pr(t, Q.L12e + 0.05, 0.45, EZ.in);
  const cam = {x: 540, y: 900, s: lerp(1.22, 1, enter) + 0.025 * pr(t, Q.L10, 10, EZ.linear) + exit * 0.5, rx: lerp(5, 0, pr(t, Q.L10, 1.4, EZ.inOut)), rz: lerp(-0.8, 0.8, pr(t, Q.L10, 11, EZ.inOut))};
  const paidRows = [pr(t, Q.paidAds - 0.05, 0.35, EZ.back), pr(t, Q.paidAds + 0.3, 0.35, EZ.back), pr(t, Q.sponsored10, 0.35, EZ.back)];
  const orgRows = [pr(t, Q.relevance - 0.05, 0.35, EZ.back), pr(t, Q.distance - 0.05, 0.35, EZ.back), pr(t, Q.prominence - 0.05, 0.35, EZ.back), pr(t, Q.higher - 0.05, 0.35, EZ.back)];
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.L09e + 0.5, 0.22) * (1 - pr(t, Q.L12e + 0.3, 0.3))}}>
      <Studio haloY={860} floorY={1500} />
      <World cam={cam} perspective={1700}>
        {paidIn > 0 && paidOut < 1 && (
          <Obj cx={540} cy={600} w={PANEL.w} h={PANEL.h} pose={{z: lerp(-500, 0, paidIn) - paidOut * 700, rx: lerp(40, 3, paidIn) + paidOut * 20, ry: Math.sin(t * 0.6) * 3, y: -paidOut * 160, s: 0.95}}>
            <PaidPanel rows={paidRows} />
          </Obj>
        )}
        {mapIn > 0 && (
          <Obj cx={540} cy={610} w={LOCALMAP.w} h={LOCALMAP.h} pose={{z: lerp(-500, 0, mapIn), rx: lerp(35, 4, mapIn), ry: Math.sin(t * 0.5) * 3, s: 0.72}}>
            <LocalSearchMap a={pr(t, Q.L12 + 0.4, 0.45)} b={pr(t, Q.L12 + 0.8, 0.5)} area={pr(t, Q.distance, 0.5, EZ.back)} />
          </Obj>
        )}
        {orgIn > 0 && (
          <Obj cx={540} cy={1060} w={PANEL.w} h={PANEL.h + 60} pose={{z: lerp(-500, 0, orgIn), rx: lerp(40, 3, orgIn), ry: Math.sin(t * 0.55 + 1) * 3, s: 0.95}}>
            <OrganicPanel rows={orgRows} />
          </Obj>
        )}
      </World>
      <AbsoluteFill style={{background: C.paper, opacity: pr(t, Q.L12e + 0.25, 0.15)}} />
    </AbsoluteFill>
  );
};
