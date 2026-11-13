import React from 'react';
import {C} from '../theme';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon} from '../components/Icons';
import {Disp, Txt} from './Props';
import {RoofGlyph} from './Ep02Props';

// Episode 04 props. The business, reviewers and reviews are fictional; the counter falling to zero is
// a dramatization, not a depiction of how or how fast Google removes reviews.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const Star: React.FC<{size: number; fill: number; color?: string}> = ({size, fill, color = C.amber}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 2.6l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" fill={fill > 0.5 ? color : 'none'} stroke={fill > 0.5 ? color : 'rgba(25,43,42,0.25)'} strokeWidth={1.6} strokeLinejoin="round" opacity={0.35 + 0.65 * Math.max(fill, 0.2)} />
  </svg>
);

// ---------------------------------------------------------------- the review panel
export const REVIEWS = {w: 600, h: 680};
export const ReviewPanel: React.FC<{count: number; stars: number; empty: number; t: number}> = ({count, stars, empty, t}) => {
  const shown = Math.max(0, Math.round(count));
  return (
    <Card3D w={REVIEWS.w} h={REVIEWS.h} depth={22} radius={40} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
      <div style={{position: 'absolute', left: 36, top: 34, display: 'flex', alignItems: 'center', gap: 16}}>
        <div style={{width: 76, height: 76, borderRadius: 22, background: C.teal, display: 'grid', placeItems: 'center'}}>
          <RoofGlyph size={44} />
        </div>
        <div>
          <Disp size={36}>Example Roofing Co.</Disp>
          <Txt size={22} color={C.muted} weight={500} style={{marginTop: 4}}>
            Reviews · example
          </Txt>
        </div>
      </div>
      <div style={{position: 'absolute', left: 36, right: 36, top: 140, height: 2, background: C.creamLine}} />
      {/* the count */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 168, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <Disp size={190} weight={800} color={shown === 0 ? 'rgba(25,43,42,0.35)' : C.charcoal} style={{lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums'}}>
          {shown}
        </Disp>
        <Disp size={40} weight={800} color={C.muted} style={{letterSpacing: '0.14em', marginTop: 4}}>
          {shown === 1 ? 'REVIEW' : 'REVIEWS'}
        </Disp>
      </div>
      {/* stars */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 452, display: 'flex', justifyContent: 'center', gap: 10}}>
        {[0, 1, 2, 3, 4].map((i) => {
          const lit = clamp01(stars * 5 - i);
          return (
            <div key={i} style={{transform: `scale(${1 + 0.18 * Math.sin(Math.PI * lit) * (stars < 1 ? 1 : 0)})`}}>
              <Star size={74} fill={lit} />
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 540, display: 'flex', justifyContent: 'center'}}>
        {empty > 0.5 ? (
          <Txt size={30} weight={600} color={C.muted}>
            No reviews yet
          </Txt>
        ) : (
          <div style={{padding: '8px 22px', borderRadius: 999, background: C.amberSoft, display: 'flex', alignItems: 'center', gap: 8}}>
            <Disp size={34} weight={800} color="#8A5F22">
              {shown > 0 ? '5.0' : '–'}
            </Disp>
            <Txt size={24} weight={700} color="#8A5F22">
              average rating
            </Txt>
          </div>
        )}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 18, display: 'flex', justifyContent: 'center'}}><div style={{padding: '4px 12px', borderRadius: 999, background: 'rgba(25,43,42,0.7)'}}>
        <Txt size={16} weight={700} color={C.cream} style={{letterSpacing: '0.12em'}}>
          DRAMATIZATION
        </Txt>
      </div></div>
      {/* subtle shimmer while the count is perfect */}
      {stars >= 1 && empty < 0.5 && <div style={{position: 'absolute', left: `${((t * 40) % 160) - 30}%`, top: 0, bottom: 0, width: '20%', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.35), rgba(255,255,255,0))'}} />}
    </Card3D>
  );
};

// ---------------------------------------------------------------- floating review cards (the cousin's accounts)
export const FAKE_REVIEWERS = ['Totally Real Bob', 'Real Customer #12', 'Not His Cousin', 'Happy Client 41', 'Real Customer #27', 'Definitely Legit', 'Real Customer #3', 'Totally Real Ann', 'Happy Client 9', 'Real Customer #50'];
const LINES = ['Best roofer ever!!!', 'Amazing!!!', '10/10 would roof again', 'Wow!!!', 'Perfect!!!'];
export const MiniReview: React.FC<{i: number; w?: number}> = ({i, w = 250}) => (
  <div style={{width: w, padding: '12px 14px', borderRadius: 18, background: C.paper, boxShadow: '0 14px 28px -14px rgba(25,43,42,0.5), 0 0 0 2px rgba(25,43,42,0.05)', display: 'flex', gap: 10, alignItems: 'center'}}>
    <div style={{width: 40, height: 40, borderRadius: '50%', background: ['#C9603F', C.teal, '#5C7A74', C.amber][i % 4], display: 'grid', placeItems: 'center', flexShrink: 0}}>
      <Disp size={20} weight={800} color={C.cream}>
        {FAKE_REVIEWERS[i % FAKE_REVIEWERS.length][0]}
      </Disp>
    </div>
    <div style={{minWidth: 0}}>
      <Txt size={17} weight={700}>
        {FAKE_REVIEWERS[i % FAKE_REVIEWERS.length]}
      </Txt>
      <div style={{display: 'flex', gap: 2, margin: '2px 0'}}>
        {[0, 1, 2, 3, 4].map((k) => (
          <Star key={k} size={15} fill={1} />
        ))}
      </div>
      <Txt size={15} weight={500} color={C.muted}>
        {LINES[i % LINES.length]}
      </Txt>
    </div>
  </div>
);

/** One of the cousin's reviews, which flips over into a fan-club membership card. */
export const FAN = {w: 560, h: 330};
export const FanReviewFace: React.FC = () => (
  <Card3D w={FAN.w} h={FAN.h} depth={18} radius={32} face={C.paper} edge={EDGE.paper} lift={60} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 30, top: 30, right: 30, display: 'flex', gap: 16, alignItems: 'center'}}>
      <div style={{width: 64, height: 64, borderRadius: '50%', background: '#C9603F', display: 'grid', placeItems: 'center'}}>
        <Disp size={30} weight={800} color={C.cream}>
          T
        </Disp>
      </div>
      <div>
        <Disp size={32}>Totally Real Bob</Disp>
        <div style={{display: 'flex', gap: 4, marginTop: 4}}>
          {[0, 1, 2, 3, 4].map((k) => (
            <Star key={k} size={28} fill={1} />
          ))}
        </div>
      </div>
    </div>
    <div style={{position: 'absolute', left: 30, right: 30, top: 140, padding: '18px 22px', borderRadius: 20, background: C.ivory}}>
      <Txt size={30} weight={600} style={{whiteSpace: 'normal'}}>
        “Best roofer ever!!! Never been there but WOW!!!”
      </Txt>
    </div>
    <Txt size={20} weight={600} color={C.muted} style={{position: 'absolute', left: 32, bottom: 22}}>
      Fictional review
    </Txt>
  </Card3D>
);
export const FanClubFace: React.FC = () => (
  <Card3D w={FAN.w} h={FAN.h} depth={18} radius={32} face={C.teal} edge={EDGE.teal} lift={60} shadowColor="14,72,66">
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 55%)'}} />
    <div style={{position: 'absolute', left: 32, top: 28}}>
      <Txt size={20} weight={700} color={C.mint} style={{letterSpacing: '0.18em'}}>
        OFFICIAL MEMBERSHIP CARD
      </Txt>
      <Disp size={52} weight={800} color={C.cream} style={{marginTop: 10}}>
        Cousin’s Fan Club
      </Disp>
      <Txt size={26} weight={600} color={C.mint} style={{marginTop: 10}}>
        Member #1 of 50 · all accounts by one cousin
      </Txt>
    </div>
    <div style={{position: 'absolute', right: 30, bottom: 26, width: 92, height: 92, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center', boxShadow: '0 8px 18px -8px rgba(0,0,0,0.5)'}}>
      <Star size={58} fill={1} color={C.cream} />
    </div>
    <div style={{position: 'absolute', left: 32, bottom: 30, padding: '6px 14px', borderRadius: 999, background: 'rgba(251,250,246,0.15)'}}>
      <Txt size={20} weight={700} color={C.cream}>
        Not customer feedback
      </Txt>
    </div>
  </Card3D>
);

/** Minimal information card for the policy explanation. */
export const PolicyCard: React.FC<{text: React.ReactNode; icon: 'trash' | 'lock'; p: number}> = ({text, icon, p}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '16px 26px 16px 16px', borderRadius: 26, background: C.paper, boxShadow: '0 18px 36px -16px rgba(25,43,42,0.5), 0 0 0 2px rgba(25,43,42,0.06)', opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 26}px) scale(${0.9 + 0.1 * p}) rotateX(${(1 - p) * 30}deg)`}}>
    <div style={{width: 58, height: 58, borderRadius: 18, background: icon === 'trash' ? C.amber : C.teal, display: 'grid', placeItems: 'center'}}>
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {icon === 'trash' ? (
          <>
            <path d="M4 7h16" />
            <path d="M9 7V4h6v3" />
            <path d="M6 7l1 13h10l1-13" />
          </>
        ) : (
          <>
            <rect x={5} y={11} width={14} height={10} rx={2} />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </>
        )}
      </svg>
    </div>
    <Disp size={34} weight={800}>
      {text}
    </Disp>
  </div>
);

// ---------------------------------------------------------------- how real reviews happen (illustrative)
export const StepCard: React.FC<{n: number; title: string; children: React.ReactNode; w?: number; h?: number}> = ({n, title, children, w = 860, h = 250}) => (
  <Card3D w={w} h={h} depth={20} radius={34} face={C.paper} edge={EDGE.paper} lift={60} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 28, top: 26, display: 'flex', alignItems: 'center', gap: 14}}>
      <div style={{width: 46, height: 46, borderRadius: '50%', background: C.teal, display: 'grid', placeItems: 'center'}}>
        <Disp size={24} weight={800} color={C.cream}>
          {n}
        </Disp>
      </div>
      <Disp size={34} weight={800}>
        {title}
      </Disp>
    </div>
    <div style={{position: 'absolute', left: 28, right: 28, top: 92, bottom: 24}}>{children}</div>
  </Card3D>
);

export const JobDone: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 18, height: '100%'}}>
    <div style={{width: 110, height: 110, borderRadius: 24, background: C.mintSoft, display: 'grid', placeItems: 'center'}}>
      <RoofGlyph size={66} color={C.teal} />
    </div>
    <div>
      <Disp size={34}>Roof leak repair</Disp>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 8}}>
        <Icon name="check" size={26} color={C.teal} stroke={3} />
        <Txt size={26} weight={600} color={C.teal}>
          Completed for a real customer
        </Txt>
      </div>
    </div>
  </div>
);

export const RequestMsg: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'center', gap: 18, height: '100%'}}>
    <div style={{flex: 1, padding: '14px 20px', borderRadius: '22px 22px 22px 6px', background: C.ivory}}>
      <Txt size={25} weight={500} style={{whiteSpace: 'normal', lineHeight: 1.3}}>
        Thanks for choosing us. If you have a moment, we’d value your honest feedback.
      </Txt>
    </div>
    <div style={{padding: '12px 20px', borderRadius: 999, background: C.teal}}>
      <Txt size={24} weight={700} color={C.cream}>
        Leave a review
      </Txt>
    </div>
  </div>
);

export const RealReview: React.FC = () => (
  <div style={{display: 'flex', alignItems: 'flex-start', gap: 16, height: '100%'}}>
    <div style={{width: 58, height: 58, borderRadius: '50%', background: '#5C7A74', display: 'grid', placeItems: 'center', flexShrink: 0}}>
      <Disp size={26} weight={800} color={C.cream}>
        C
      </Disp>
    </div>
    <div style={{flex: 1}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
        <Txt size={24} weight={700}>
          A real customer
        </Txt>
        <div style={{display: 'flex', gap: 2}}>
          {[1, 1, 1, 1, 0].map((f, k) => (
            <Star key={k} size={22} fill={f} />
          ))}
        </div>
      </div>
      <Txt size={24} weight={500} color={C.muted} style={{whiteSpace: 'normal', marginTop: 6, lineHeight: 1.3}}>
        “Fixed our leak quickly and explained the cost upfront.”
      </Txt>
    </div>
  </div>
);

export const RuleChip: React.FC<{label: string; p: number; icon?: 'x' | 'check'}> = ({label, p, icon = 'x'}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px 12px 12px', borderRadius: 999, background: C.paper, boxShadow: '0 14px 28px -14px rgba(25,43,42,0.45), 0 0 0 2px rgba(25,43,42,0.06)', opacity: clamp01(p * 2), transform: `translateY(${(1 - p) * 20}px) scale(${0.9 + 0.1 * p})`}}>
    <div style={{width: 40, height: 40, borderRadius: '50%', background: icon === 'x' ? C.amber : C.teal, display: 'grid', placeItems: 'center'}}>
      {icon === 'x' ? (
        <svg width={20} height={20} viewBox="0 0 24 24" stroke={C.cream} strokeWidth={3.4} strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      ) : (
        <Icon name="check" size={24} color={C.cream} stroke={3.2} />
      )}
    </div>
    <Disp size={32} weight={700}>
      {label}
    </Disp>
  </div>
);
