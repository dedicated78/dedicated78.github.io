import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Obj} from '../components/Card3D';
import {Txt} from '../props/Props';
import {CheckChip} from '../props/Ep03Props';
import {LESSON, ReviewsCard, TIPS} from '../props/Ep06Props';
import {Studio, World} from './common';

// GrowwithMH lesson (narrator): reviews and ratings matter and can help prominence, but review count
// alone doesn't decide rankings; then three practical, policy-safe actions. No guaranteed outcome.
export const Lesson6: React.FC<{t: number}> = ({t}) => {
  const inP = pr(t, Q.lessonIn - 0.05, 0.35);
  const outP = pr(t, Q.lessonOut - 0.2, 0.35, EZ.in);
  const cardIn = pr(t, Q.L08 - 0.25, 0.5, EZ.back);
  const up = pr(t, Q.L09 - 0.3, 0.6, EZ.inOut);
  const tipAt = [Q.accurate, Q.categories, Q.genuine];
  return (
    <AbsoluteFill style={{opacity: inP * (1 - outP)}}>
      <Studio haloX={540} haloY={760} floorY={1600} />
      <World cam={{x: 540, y: 960, s: lerp(1.04, 1, pr(t, Q.lessonIn, 6, EZ.linear))}}>
        <Obj cx={540} cy={lerp(780, 600, up)} w={LESSON.w} h={LESSON.h} pose={{s: lerp(1, 0.9, up) * lerp(0.7, 1, cardIn), z: lerp(-300, 0, cardIn), rx: lerp(40, 4, cardIn), ry: Math.sin(t * 0.8) * 2.5}}>
          <div style={{opacity: Math.min(1, cardIn * 2)}}>
            <ReviewsCard p={pr(t, Q.ratings - 0.1, 0.8)} alone={pr(t, Q.reviewCount - 0.1, 0.45, EZ.back)} />
          </div>
        </Obj>
      </World>
      <div style={{position: 'absolute', left: 0, right: 0, top: 930, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
        {TIPS.map((tip, i) => (
          <CheckChip key={tip.label} label={tip.label} p={pr(t, tipAt[i] - 0.1, 0.4, EZ.back)} icon={tip.icon} />
        ))}
        <div style={{marginTop: 8, opacity: pr(t, Q.genuine + 0.7, 0.4)}}>
          <Txt size={26} weight={700} color={C.muted} style={{letterSpacing: '0.04em'}}>
            No single factor guarantees a ranking.
          </Txt>
        </div>
      </div>
    </AbsoluteFill>
  );
};
