import React from 'react';
import {C} from '../theme';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';
import {Disp, Txt} from './Props';
import {RoofGlyph} from './Ep02Props';

// Episode 05 props. The auction, the listing, the checkout and every price are fictional parody —
// not Google products, screens or real advertising prices.

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// ---------------------------------------------------------------- the bid board
export const BOARD = {w: 560, h: 300};
export const BidBoard: React.FC<{amount: number; bidder: number; flash: number}> = ({amount, bidder, flash}) => (
  <Card3D w={BOARD.w} h={BOARD.h} depth={22} radius={36} face={C.charcoal} edge={EDGE.dark} lift={70} shadowColor="14,28,27">
    {/* SOLD flash: an inset amber ring inside the face (an outer box-shadow on a 3D plane tears in Chrome) */}
    {flash > 0.01 && <div style={{position: 'absolute', inset: 0, borderRadius: 36, boxShadow: `inset 0 0 0 ${6 * flash}px rgba(211,155,79,${0.9 * flash}), inset 0 0 ${60 * flash}px rgba(211,155,79,${0.45 * flash})`}} />}
    <div style={{position: 'absolute', left: 30, top: 26, right: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <Txt size={22} weight={700} color={C.mint} style={{letterSpacing: '0.18em'}}>
        CURRENT BID
      </Txt>
      <div style={{padding: '4px 12px', borderRadius: 999, background: 'rgba(251,250,246,0.12)'}}>
        <Txt size={16} weight={700} color={C.cream} style={{letterSpacing: '0.12em'}}>
          FICTIONAL
        </Txt>
      </div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 70, display: 'flex', justifyContent: 'center'}}>
      <Disp size={140} weight={800} color={C.cream} style={{fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em'}}>
        ${Math.round(amount)}
      </Disp>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 26, display: 'flex', justifyContent: 'center', opacity: clamp01(bidder * 2)}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px', borderRadius: 999, background: C.amber}}>
        <RoofGlyph size={24} />
        <Txt size={22} weight={700} color={C.cream}>
          Example Roofing Co.
        </Txt>
      </div>
    </div>
  </Card3D>
);

// ---------------------------------------------------------------- the imagined map listing
export const LISTING = {w: 600, h: 660};
const OTHERS = [
  {n: 'Northside Roofing', r: '4.6'},
  {n: 'Peak Roof Repair', r: '4.4'},
];
/** rise: 0..1 his listing climbs from the bottom row to the top; sponsored: 0..1 label appears. */
export const ListingCard: React.FC<{rise: number; sponsored: number; glow: number}> = ({rise, sponsored, glow}) => {
  const rowH = 132;
  const mineY = 300 + (1 - rise) * 2 * rowH;
  return (
    <Card3D w={LISTING.w} h={LISTING.h} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
      {/* map strip */}
      <div style={{position: 'absolute', left: 24, right: 24, top: 24, height: 210, borderRadius: 24, overflow: 'hidden', background: '#1E3533'}}>
        <svg width="100%" height="100%" viewBox="0 0 552 210" preserveAspectRatio="xMidYMid slice">
          {[50, 110, 170].map((y) => (
            <path key={y} d={`M0 ${y} H552`} stroke="rgba(183,216,197,0.18)" strokeWidth={8} />
          ))}
          {[90, 230, 370, 510].map((x) => (
            <path key={x} d={`M${x} 0 V210`} stroke="rgba(183,216,197,0.18)" strokeWidth={8} />
          ))}
          <path d="M0 160 C 140 130, 260 190, 400 150 S 540 130, 552 140" stroke="rgba(23,97,90,0.95)" strokeWidth={18} fill="none" />
          {[[150, 80], [420, 70], [300, 120]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M0 0 C -8 -10, -12 -16, -12 -22 A12 12 0 1 1 12 -22 C 12 -16, 8 -10, 0 0 Z" fill={i === 2 ? C.amber : C.mint} stroke={C.cream} strokeWidth={2} />
            </g>
          ))}
        </svg>
        <div style={{position: 'absolute', left: 14, top: 12, padding: '4px 12px', borderRadius: 999, background: 'rgba(251,250,246,0.92)'}}>
          <Txt size={16} weight={700} style={{letterSpacing: '0.1em'}}>
            ILLUSTRATIVE
          </Txt>
        </div>
      </div>
      {/* competitors */}
      {OTHERS.map((o, i) => {
        const slot = i + (rise > 0.5 ? 1 : 0);
        return (
          <div key={o.n} style={{position: 'absolute', left: 24, right: 24, top: 300 + slot * rowH, height: 112, borderRadius: 22, background: C.ivory, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', transition: 'none'}}>
            <div style={{width: 64, height: 64, borderRadius: 18, background: C.hair}} />
            <div>
              <Txt size={26} weight={700} color={C.muted}>
                {o.n}
              </Txt>
              <Txt size={20} weight={500} color={C.muted}>
                ★ {o.r} · Roofing contractor
              </Txt>
            </div>
          </div>
        );
      })}
      {/* his listing (rises to the top) */}
      <div style={{position: 'absolute', left: 20, right: 20, top: mineY - 6, height: 124, borderRadius: 24, background: C.paper, boxShadow: `0 0 0 3px rgba(211,155,79,${0.4 + 0.6 * glow}), 0 16px 30px -16px rgba(25,43,42,0.5)`, display: 'flex', alignItems: 'center', gap: 16, padding: '0 22px'}}>
        <div style={{width: 72, height: 72, borderRadius: 20, background: C.teal, display: 'grid', placeItems: 'center'}}>
          <RoofGlyph size={42} />
        </div>
        <div>
          {sponsored > 0.01 && (
            <div style={{display: 'inline-flex', marginBottom: 4, padding: '2px 12px', borderRadius: 8, border: `2.5px solid ${C.charcoal}`, background: C.amberSoft, transform: `scale(${0.6 + 0.4 * sponsored})`, transformOrigin: '0 50%', opacity: clamp01(sponsored * 2)}}>
              <Txt size={22} weight={800} color={C.charcoal} style={{letterSpacing: '0.04em'}}>
                Sponsored
              </Txt>
            </div>
          )}
          <Disp size={32}>Example Roofing Co.</Disp>
          <Txt size={20} weight={500} color={C.muted}>
            Roofing contractor · example
          </Txt>
        </div>
      </div>
    </Card3D>
  );
};

// ---------------------------------------------------------------- the imaginary trophy
export const Trophy: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={w * 1.25} viewBox="0 0 100 125" style={{overflow: 'visible'}}>
    <defs>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#F2CC7A" />
        <stop offset="55%" stopColor={C.amber} />
        <stop offset="100%" stopColor="#A9762F" />
      </linearGradient>
    </defs>
    <path d="M22 10 H78 V36 Q78 66 50 72 Q22 66 22 36 Z" fill="url(#gold)" stroke="#A9762F" strokeWidth={2.5} />
    <path d="M22 18 Q6 18 8 34 Q10 48 26 50" stroke="#C58A3E" strokeWidth={6} fill="none" strokeLinecap="round" />
    <path d="M78 18 Q94 18 92 34 Q90 48 74 50" stroke="#C58A3E" strokeWidth={6} fill="none" strokeLinecap="round" />
    <rect x={44} y={70} width={12} height={20} fill="#C58A3E" />
    <rect x={28} y={90} width={44} height={12} rx={3} fill="#A9762F" />
    <rect x={22} y={102} width={56} height={16} rx={4} fill={C.charcoal} />
    <text x={50} y={46} textAnchor="middle" fontFamily="GW Poppins, Poppins, sans-serif" fontWeight={800} fontSize={22} fill={C.cream}>
      #1
    </text>
    <path d="M30 20 Q34 44 46 56" stroke="rgba(255,255,255,0.45)" strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

// ---------------------------------------------------------------- the fictional checkout
export const CHECKOUT = {w: 600, h: 400};
export const CheckoutCard: React.FC<{gone: number; stamp: number}> = ({gone, stamp}) => (
  <Card3D w={CHECKOUT.w} h={CHECKOUT.h} depth={20} radius={36} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 32, top: 28, right: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <Disp size={36}>Checkout</Disp>
      <div style={{padding: '4px 12px', borderRadius: 999, background: 'rgba(25,43,42,0.75)'}}>
        <Txt size={16} weight={700} color={C.cream} style={{letterSpacing: '0.12em'}}>
          FICTIONAL
        </Txt>
      </div>
    </div>
    <div style={{position: 'absolute', left: 32, right: 32, top: 100, height: 110, borderRadius: 22, background: C.ivory, display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px'}}>
      <div style={{width: 64, height: 64, borderRadius: 18, background: C.amber, display: 'grid', placeItems: 'center'}}>
        <Disp size={30} weight={800} color={C.cream}>
          #1
        </Disp>
      </div>
      <Disp size={34} weight={800}>
        ORGANIC #1 RANKING
      </Disp>
    </div>
    {/* the checkout button disappears */}
    <div style={{position: 'absolute', left: 32, right: 32, top: 240, height: 92, borderRadius: 46, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 1 - gone, transform: `scale(${1 - 0.4 * gone})`}}>
      <Icon name="check" size={32} color={C.cream} stroke={3} />
      <Disp size={36} weight={800} color={C.cream}>
        Buy now
      </Disp>
    </div>
    {stamp > 0.01 && (
      <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', justifyContent: 'center'}}>
        <div style={{padding: '12px 30px', borderRadius: 16, border: `6px solid ${C.amber}`, transform: `rotate(-8deg) scale(${1.6 - 0.6 * stamp})`, opacity: clamp01(stamp * 2), background: 'rgba(251,250,246,0.92)'}}>
          <Disp size={64} weight={800} color="#B5792C" style={{letterSpacing: '0.04em'}}>
            NOT FOR SALE
          </Disp>
        </div>
      </div>
    )}
  </Card3D>
);

// ---------------------------------------------------------------- lesson panels
const Row: React.FC<{icon: IconName | 'lock' | 'pin'; text: string; p: number; tone?: string}> = ({icon, text, p, tone = C.teal}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 16, height: 58, padding: '0 18px', borderRadius: 18, background: C.ivory, opacity: clamp01(p * 2), transform: `translateX(${(1 - p) * 30}px)`}}>
    <div style={{width: 38, height: 38, borderRadius: 12, background: tone, display: 'grid', placeItems: 'center'}}>
      {icon === 'lock' ? (
        <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.cream} strokeWidth={2.4} strokeLinecap="round">
          <rect x={5} y={11} width={14} height={10} rx={2} />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      ) : (
        <Icon name={icon as IconName} size={22} color={C.cream} stroke={2.4} />
      )}
    </div>
    <Txt size={28} weight={600}>
      {text}
    </Txt>
  </div>
);
export const PANEL = {w: 900, h: 400};
export const PaidPanel: React.FC<{rows: number[]}> = ({rows}) => (
  <Card3D w={PANEL.w} h={PANEL.h} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 34, top: 28, display: 'flex', alignItems: 'center', gap: 16}}>
      <div style={{padding: '6px 16px', borderRadius: 10, border: `3px solid ${C.charcoal}`, background: C.amberSoft}}>
        <Txt size={24} weight={800}>
          Sponsored
        </Txt>
      </div>
      <Disp size={48} weight={800}>
        PAID ADS
      </Disp>
    </div>
    <div style={{position: 'absolute', left: 34, right: 34, top: 112, display: 'flex', flexDirection: 'column', gap: 12}}>
      <Row icon="pin" text="Sponsored placement" p={rows[0] ?? 0} tone={C.amber} />
      <Row icon="spark" text="Advertising campaign" p={rows[1] ?? 0} tone={C.amber} />
      <Row icon="arrow" text="Paid visibility opportunity" p={rows[2] ?? 0} tone={C.amber} />
    </div>
  </Card3D>
);
export const OrganicPanel: React.FC<{rows: number[]}> = ({rows}) => (
  <Card3D w={PANEL.w} h={PANEL.h + 60} depth={22} radius={38} face={C.paper} edge={EDGE.paper} lift={70} shadowColor="25,43,42">
    <div style={{position: 'absolute', left: 34, top: 28, display: 'flex', alignItems: 'center', gap: 16}}>
      <div style={{width: 52, height: 52, borderRadius: 16, background: C.teal, display: 'grid', placeItems: 'center'}}>
        <Icon name="pin" size={30} color={C.cream} />
      </div>
      <Disp size={44} weight={800}>
        ORGANIC LOCAL RANKINGS
      </Disp>
    </div>
    <div style={{position: 'absolute', left: 34, right: 34, top: 108, display: 'flex', flexDirection: 'column', gap: 10}}>
      <Row icon="search" text="Relevance" p={rows[0] ?? 0} />
      <Row icon="route" text="Distance" p={rows[1] ?? 0} />
      <Row icon="spark" text="Prominence" p={rows[2] ?? 0} />
      <Row icon="lock" text="Not purchasable as a ranking position" p={rows[3] ?? 0} tone={C.charcoal} />
    </div>
  </Card3D>
);
