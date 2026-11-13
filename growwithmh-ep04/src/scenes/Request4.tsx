import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Obj} from '../components/Card3D';
import {JobDone, RealReview, RequestMsg, RuleChip, StepCard} from '../props/Ep04Props';
import {Studio, World} from './common';

// How real reviews happen (illustrative): a finished job, a neutral request for honest feedback, and a
// genuine review that is not a guaranteed five stars. No rewards, no pressure, ask every customer.
const STEPS = [
  {y: 600, title: 'A real job, finished', at: () => Q.L11 + 0.2, node: <JobDone />},
  {y: 880, title: 'Ask for honest feedback', at: () => Q.genuine - 0.1, node: <RequestMsg />},
  {y: 1160, title: 'A genuine review', at: () => Q.honest + 0.35, node: <RealReview />},
];

export const Request4: React.FC<{t: number}> = ({t}) => {
  const enter = pr(t, Q.L10e + 0.45, 0.6, EZ.out);
  const exit = pr(t, Q.L11e + 0.05, 0.45, EZ.in);
  const cam = {x: 540, y: 900, s: lerp(1.22, 1, enter) + 0.025 * pr(t, Q.L11, 7, EZ.linear) + exit * 0.5, rx: lerp(5, 0, pr(t, Q.L11, 1.4, EZ.inOut)), rz: lerp(-0.8, 0.8, pr(t, Q.L11, 8, EZ.inOut))};
  return (
    <AbsoluteFill style={{opacity: pr(t, Q.L10e + 0.5, 0.22) * (1 - pr(t, Q.L11e + 0.3, 0.3))}}>
      <Studio haloY={860} floorY={1500} />
      <World cam={cam} perspective={1700}>
        {STEPS.map((s, i) => {
          const p = pr(t, s.at() - 0.05, 0.45, EZ.back);
          if (p <= 0) return null;
          return (
            <Obj key={i} cx={540} cy={lerp(s.y + 160, s.y, p)} w={860} h={240} pose={{z: lerp(-500, 0, p), rx: lerp(45, 3, p), ry: lerp(i % 2 ? 16 : -16, 0, p) + Math.sin(t * 0.6 + i) * 2, s: lerp(0.65, 1, p)}}>
              <StepCard n={i + 1} title={s.title} h={240}>
                {s.node}
              </StepCard>
            </Obj>
          );
        })}
      </World>
      <div style={{position: 'absolute', left: 0, right: 0, top: 262, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        <RuleChip label="No rewards" p={pr(t, Q.noRewards - 0.05, 0.35, EZ.back)} />
        <RuleChip label="No pressure" p={pr(t, Q.noPressure - 0.05, 0.35, EZ.back)} />
        <RuleChip label="Ask every customer" icon="check" p={pr(t, Q.noAsking - 0.05, 0.35, EZ.back)} />
      </div>
      <AbsoluteFill style={{background: C.paper, opacity: pr(t, Q.L11e + 0.25, 0.15)}} />
    </AbsoluteFill>
  );
};
