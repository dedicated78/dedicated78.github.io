import React from 'react';
import {C, FONT_DISPLAY, FONT_TEXT} from '../theme';
import {EZ, pr, lerp} from '../timing';
import {Card3D, EDGE} from '../components/Card3D';
import {Icon, IconName} from '../components/Icons';

// ---------------------------------------------------------------- shared text
export const Disp: React.FC<{size: number; color?: string; weight?: number; italic?: boolean; style?: React.CSSProperties; children: React.ReactNode}> = ({size, color = C.charcoal, weight = 700, italic, style, children}) => (
  <div style={{fontFamily: FONT_DISPLAY, fontWeight: weight, fontStyle: italic ? 'italic' : 'normal', fontSize: size, lineHeight: 1.04, letterSpacing: '-0.02em', color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
export const Txt: React.FC<{size: number; color?: string; weight?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({size, color = C.charcoal, weight = 600, style, children}) => (
  <div style={{fontFamily: FONT_TEXT, fontWeight: weight, fontSize: size, lineHeight: 1.2, color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);

// ---------------------------------------------------------------- verified seal
export const Seal: React.FC<{size: number; color?: string}> = ({size, color = C.teal}) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path
      d="M50 4 L59 13 L71 10 L75 22 L87 26 L84 38 L93 47 L84 56 L87 68 L75 72 L71 84 L59 81 L50 90 L41 81 L29 84 L25 72 L13 68 L16 56 L7 47 L16 38 L13 26 L25 22 L29 10 L41 13 Z"
      fill={color}
      transform="translate(0 3)"
    />
    <path d="M32 50 L45 62 L69 37" stroke={C.cream} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------------------------------------------------------------- business profile card
export const PROFILE = {w: 760, h: 430};
export const ProfileCard: React.FC<{
  t: number;
  verifiedAt: number;
  ry?: number;
  shake?: number;
  rows?: 'actions' | 'checklist';
  checks?: number[]; // 0..1 progress per checklist row
  manageNote?: number; // 0..1 "You can manage it" ribbon
}> = ({t, verifiedAt, ry = 0, shake = 0, rows = 'actions', checks = [0, 0, 0], manageNote = 0}) => {
  const v = pr(t, verifiedAt, 0.35, EZ.back);
  const sh = shake > 0 ? Math.sin(t * 60) * 6 * shake : 0;
  return (
    <Card3D
      w={PROFILE.w}
      h={PROFILE.h}
      depth={22}
      radius={36}
      face={C.paper}
      edge={EDGE.paper}
      ry={ry}
      lift={70}
      shadowColor="25,43,42"
      layers={[
        {
          key: 'seal',
          z: 46,
          opacity: Math.min(1, v * 2),
          node: (
            <div style={{position: 'absolute', right: 34, top: 30, transform: `translateX(${sh}px) scale(${lerp(2.2, 1, v)}) rotate(${lerp(-40, 0, v)}deg)`, transformOrigin: '50% 50%'}}>
              <Seal size={104} />
            </div>
          ),
        },
        {
          key: 'title',
          z: 22,
          node: (
            <div style={{position: 'absolute', left: 40, top: 40, display: 'flex', gap: 24, alignItems: 'center'}}>
              <div style={{width: 104, height: 104, borderRadius: 28, background: C.teal, display: 'grid', placeItems: 'center', boxShadow: '8px 14px 24px -10px rgba(25,43,42,0.45)'}}>
                <Icon name="tools" size={58} color={C.cream} stroke={2} />
              </div>
              <div>
                <Disp size={50}>Your Business</Disp>
                <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 8}}>
                  <Txt size={28} color={C.muted} weight={500}>
                    Local service
                  </Txt>
                  <div style={{opacity: v, transform: `scale(${0.8 + 0.2 * v})`, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 14px 4px 10px', borderRadius: 999, background: C.mintSoft}}>
                    <Icon name="check" size={22} color={C.teal} stroke={3} />
                    <Txt size={24} color={C.teal} weight={700}>
                      Verified
                    </Txt>
                  </div>
                </div>
              </div>
            </div>
          ),
        },
      ]}
    >
      <div style={{position: 'absolute', left: 40, right: 40, top: 178, height: 2, background: C.creamLine}} />
      {rows === 'actions' ? (
        <div style={{position: 'absolute', left: 40, right: 40, top: 212, display: 'flex', flexDirection: 'column', gap: 18}}>
          {([['clock', 'Hours'], ['pin', 'Service area']] as Array<[IconName, string]>).map(([ic, l]) => (
            <div key={l} style={{display: 'flex', alignItems: 'center', gap: 16}}>
              <Icon name={ic} size={30} color={C.teal} />
              <Txt size={28} color={C.muted} weight={500} style={{width: 200}}>
                {l}
              </Txt>
              <div style={{width: 300, height: 14, borderRadius: 7, background: C.hair}} />
            </div>
          ))}
          <div style={{display: 'flex', gap: 14, marginTop: 8}}>
            {([['phone', 'Call'], ['directions', 'Directions'], ['globe', 'Website']] as Array<[IconName, string]>).map(([ic, l], i) => (
              <div key={l} style={{flex: 1, height: 58, borderRadius: 29, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: i === 0 ? C.teal : C.ivory, fontFamily: FONT_TEXT, fontWeight: 600, fontSize: 26, color: i === 0 ? C.cream : C.charcoal}}>
                <Icon name={ic} size={26} color={i === 0 ? C.cream : C.teal} />
                {l}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{position: 'absolute', left: 40, right: 40, top: 206, display: 'flex', flexDirection: 'column', gap: 16}}>
          {['Accurate business info', 'Right primary category', 'Stronger local presence'].map((l, i) => {
            const c = checks[i] ?? 0;
            return (
              <div key={l} style={{display: 'flex', alignItems: 'center', gap: 18, height: 56, padding: '0 18px', borderRadius: 18, background: c > 0.02 ? `rgba(183,216,197,${0.45 * c})` : C.ivory, transform: `translateX(${(1 - Math.min(1, c * 3)) * 0}px)`}}>
                <div style={{width: 38, height: 38, borderRadius: '50%', border: `3px solid ${C.teal}`, background: c > 0.5 ? C.teal : 'transparent', display: 'grid', placeItems: 'center', transform: `scale(${1 + 0.25 * Math.sin(Math.PI * Math.min(1, c))})`}}>
                  {c > 0.5 && <Icon name="check" size={24} color={C.cream} stroke={3.4} />}
                </div>
                <Txt size={32} color={C.charcoal} weight={600}>
                  {l}
                </Txt>
              </div>
            );
          })}
        </div>
      )}
      {manageNote > 0 && (
        <div style={{position: 'absolute', left: 40, right: 40, bottom: 26, height: 70, borderRadius: 20, background: C.teal, display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', opacity: manageNote, transform: `translateY(${(1 - manageNote) * 30}px)`}}>
          <Icon name="check" size={30} color={C.cream} stroke={3} />
          <Txt size={30} color={C.cream} weight={700}>
            Verified = you can manage it
          </Txt>
        </div>
      )}
    </Card3D>
  );
};

// ---------------------------------------------------------------- phone
export const Phone: React.FC<{w: number; flip: number; ringing: number; screen: 'call' | 'profile' | 'maps' | 'missed'; t: number; glow?: number}> = ({w, flip, ringing, screen, t, glow = 0}) => {
  const h = w * 2;
  const r = w * 0.17;
  const face: React.CSSProperties = {position: 'absolute', inset: 0, borderRadius: r, backfaceVisibility: 'hidden', overflow: 'hidden'};
  const pulse = ringing > 0 ? 0.5 + 0.5 * Math.sin(t * 22) : 0;
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d', transform: `rotateY(${lerp(180, 0, flip)}deg)`}}>
      {/* edge thickness */}
      {Array.from({length: 7}).map((_, i) => (
        <div key={i} style={{position: 'absolute', inset: 0, borderRadius: r, background: '#0E2220', transform: `translateZ(${-2 - i * 2}px)`}} />
      ))}
      {/* screen side */}
      <div style={{...face, background: '#0F1E1D', border: '4px solid #24413E', transform: 'translateZ(1px)'}}>
        {screen === 'maps' ? (
          <div style={{position: 'absolute', inset: 0, background: '#14302D'}}>
            <Neighborhood w={w} h={h} pins={0.6} ownPin={1} />
            <div style={{position: 'absolute', left: w * 0.07, right: w * 0.07, top: w * 0.09, height: w * 0.14, borderRadius: w * 0.07, background: C.paper, display: 'flex', alignItems: 'center', gap: w * 0.03, padding: `0 ${w * 0.05}px`, boxShadow: '0 6px 14px -6px rgba(0,0,0,0.5)'}}>
              <Icon name="search" size={w * 0.075} color={C.teal} />
              <Txt size={w * 0.062} weight={600}>
                Example Roofing Co.
              </Txt>
            </div>
            {glow > 0 && <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 55%, rgba(183,216,197,${0.55 * glow}), rgba(42,128,119,${0.25 * glow}) 45%, rgba(0,0,0,0) 75%)`}} />}
          </div>
        ) : screen === 'missed' ? (
          <div style={{position: 'absolute', inset: 0, background: C.cream, padding: `${w * 0.1}px ${w * 0.07}px`, display: 'flex', flexDirection: 'column', gap: w * 0.045}}>
            <Txt size={w * 0.085} weight={700}>
              Missed calls
            </Txt>
            {['Sun 9:12 AM', 'Sun 11:40 AM', 'Sun 2:05 PM', 'Sun 4:31 PM'].map((l) => (
              <div key={l} style={{display: 'flex', alignItems: 'center', gap: w * 0.04, padding: `${w * 0.035}px ${w * 0.04}px`, borderRadius: w * 0.05, background: C.paper, boxShadow: '0 2px 0 rgba(25,43,42,0.06)'}}>
                <div style={{width: w * 0.12, height: w * 0.12, borderRadius: '50%', background: C.amberSoft, display: 'grid', placeItems: 'center'}}>
                  <Icon name="phone" size={w * 0.065} color="#A9762F" />
                </div>
                <div>
                  <Txt size={w * 0.058} weight={700}>
                    Customer
                  </Txt>
                  <Txt size={w * 0.05} color={C.muted} weight={500}>
                    {l}
                  </Txt>
                </div>
              </div>
            ))}
          </div>
        ) : screen === 'call' ? (
          <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(170deg, #1E3B38, #0D1C1B)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: h * 0.12}}>
            <Txt size={w * 0.075} color={C.mint} weight={600}>
              Incoming call
            </Txt>
            <div style={{width: w * 0.42, height: w * 0.42, borderRadius: '50%', background: C.amber, marginTop: h * 0.06, display: 'grid', placeItems: 'center', boxShadow: `0 0 0 ${8 + pulse * 10}px rgba(211,155,79,${0.25 * ringing})`}}>
              <Disp size={w * 0.22} color={C.cream} weight={800}>
                M
              </Disp>
            </div>
            <Disp size={w * 0.2} color={C.cream} weight={800} style={{marginTop: h * 0.04, letterSpacing: '0.02em'}}>
              MOM
            </Disp>
            <div style={{position: 'absolute', bottom: h * 0.09, left: 0, right: 0, display: 'flex', justifyContent: 'space-around'}}>
              <div style={{width: w * 0.22, height: w * 0.22, borderRadius: '50%', background: C.amber, display: 'grid', placeItems: 'center'}}>
                <Icon name="phone" size={w * 0.1} color={C.cream} />
              </div>
              <div style={{width: w * 0.22, height: w * 0.22, borderRadius: '50%', background: C.tealBright, display: 'grid', placeItems: 'center'}}>
                <Icon name="phone" size={w * 0.1} color={C.cream} />
              </div>
            </div>
          </div>
        ) : (
          <div style={{position: 'absolute', inset: 0, background: C.cream, padding: w * 0.08, display: 'flex', flexDirection: 'column', gap: w * 0.06}}>
            <div style={{height: w * 0.11, borderRadius: w * 0.055, background: C.paper, border: `2px solid ${C.hair}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px'}}>
              <Icon name="search" size={w * 0.07} color={C.muted} />
              <div style={{width: '50%', height: 8, borderRadius: 4, background: C.hair}} />
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: w * 0.05}}>
              <div style={{width: w * 0.2, height: w * 0.2, borderRadius: w * 0.05, background: C.teal}} />
              <div>
                <Txt size={w * 0.085} weight={700}>
                  Your Business
                </Txt>
                <div style={{display: 'flex', alignItems: 'center', gap: 4, marginTop: 4}}>
                  <Seal size={w * 0.09} />
                  <Txt size={w * 0.06} color={C.teal} weight={700}>
                    Verified
                  </Txt>
                </div>
              </div>
            </div>
            {[0.9, 0.7, 0.8].map((x, i) => (
              <div key={i} style={{width: `${x * 100}%`, height: 10, borderRadius: 5, background: C.hair}} />
            ))}
            <div style={{flex: 1, borderRadius: w * 0.06, background: C.mintSoft, display: 'grid', placeItems: 'center'}}>
              <Txt size={w * 0.065} color={C.muted} weight={600}>
                No new calls yet
              </Txt>
            </div>
          </div>
        )}
      </div>
      {/* back */}
      <div style={{...face, background: 'linear-gradient(150deg, #24534E, #0F2E2B)', transform: 'rotateY(180deg) translateZ(16px)'}}>
        <div style={{position: 'absolute', left: w * 0.1, top: w * 0.1, width: w * 0.34, height: w * 0.34, borderRadius: w * 0.09, background: '#0B1F1D', display: 'grid', gridTemplateColumns: '1fr 1fr', padding: w * 0.04, gap: w * 0.03}}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{borderRadius: '50%', background: '#1C3A37', border: '2px solid #2E5550'}} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- 3D flip calendar (Mon → Fri)
export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
/** `page` is a continuous value: 0 = MON showing, 3 = THU, 4 = FRI. */
export const Calendar3D: React.FC<{w: number; page: number; note?: number; noteStrike?: number}> = ({w, page, note = 0, noteStrike = 0}) => {
  const h = w * 1.05;
  const pageFace = (i: number, extra?: React.ReactNode) => (
    <div style={{position: 'absolute', inset: 0, borderRadius: w * 0.06, background: C.paper, overflow: 'hidden', boxShadow: 'inset 0 -3px 0 rgba(25,43,42,0.06)'}}>
      <div style={{height: h * 0.24, background: i === 4 ? C.amber : C.teal, display: 'grid', placeItems: 'center'}}>
        <Disp size={w * 0.13} color={C.cream} weight={800} style={{letterSpacing: '0.12em'}}>
          {DAYS[i]}
        </Disp>
      </div>
      <div style={{position: 'absolute', top: h * 0.3, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: h * 0.035}}>
        {i === 4 ? (
          extra
        ) : (
          [0.7, 0.55, 0.62].map((x, k) => <div key={k} style={{width: w * x, height: h * 0.05, borderRadius: h * 0.025, background: C.hair}} />)
        )}
      </div>
    </div>
  );
  const friday = (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: h * 0.04, opacity: 1}}>
      <Txt size={w * 0.07} color={C.muted} weight={600}>
        Plans
      </Txt>
      <div style={{position: 'relative', padding: `${h * 0.03}px ${w * 0.06}px`, borderRadius: w * 0.04, background: C.amberSoft, opacity: note, transform: `rotate(-3deg) scale(${0.8 + 0.2 * note})`}}>
        <Disp size={w * 0.085} color={C.charcoal} weight={700}>
          Be a millionaire
        </Disp>
        <div style={{position: 'absolute', left: '4%', top: '52%', height: w * 0.018, width: `${92 * noteStrike}%`, background: C.charcoal, borderRadius: 4}} />
      </div>
      <div style={{width: w * 0.55, height: h * 0.05, borderRadius: h * 0.025, background: C.hair}} />
    </div>
  );
  return (
    <div style={{position: 'relative', width: w, height: h, transformStyle: 'preserve-3d'}}>
      {/* stand */}
      <div style={{position: 'absolute', left: -w * 0.04, right: -w * 0.04, top: -h * 0.06, height: h * 0.1, borderRadius: w * 0.04, background: C.charcoal, transform: 'translateZ(-30px)'}} />
      {/* pages from back (FRI) to front (MON); a page i flips up once page > i */}
      {[4, 3, 2, 1, 0].map((i) => {
        const f = Math.max(0, Math.min(1, page - i));
        if (f >= 1 && i < 4) return null;
        return (
          <div key={i} style={{position: 'absolute', inset: 0, transformOrigin: '50% 0%', transform: `translateZ(${(4 - i) * 1.5}px) rotateX(${f * 165}deg)`, backfaceVisibility: 'hidden'}}>
            {pageFace(i, friday)}
          </div>
        );
      })}
      {/* rings */}
      {[0.28, 0.72].map((x) => (
        <div key={x} style={{position: 'absolute', left: w * x - 10, top: -h * 0.08, width: 20, height: h * 0.13, borderRadius: 10, background: '#8C9692', transform: 'translateZ(12px)'}} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- confetti
export const Confetti: React.FC<{t: number; at: number; x: number; y: number; n?: number}> = ({t, at, x, y, n = 70}) => {
  const dt = t - at;
  if (dt < 0 || dt > 3.2) return null;
  const cols = [C.teal, C.mint, C.amber, C.tealBright, C.charcoal];
  return (
    <>
      {Array.from({length: n}).map((_, i) => {
        const r = (k: number) => {
          const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
          return s - Math.floor(s);
        };
        const ang = -Math.PI / 2 + (r(1) - 0.5) * 2.4;
        const sp = 900 + r(2) * 900;
        const px = x + Math.cos(ang) * sp * dt * 0.9 + Math.sin(dt * 3 + i) * 30 * dt;
        const py = y + Math.sin(ang) * sp * dt + 1500 * dt * dt * 0.5;
        const rot = r(3) * 360 + dt * (300 + r(4) * 500);
        const flip = Math.cos(dt * (6 + r(5) * 8) + i);
        const o = Math.min(1, (3.2 - dt) / 0.6);
        return <div key={i} style={{position: 'absolute', left: px, top: py, width: 16 + r(6) * 12, height: 10 + r(7) * 8, borderRadius: 3, background: cols[i % cols.length], transform: `rotate(${rot}deg) scaleX(${flip})`, opacity: o}} />;
      })}
    </>
  );
};

// ---------------------------------------------------------------- 3D question mark
export const QMark: React.FC<{size: number; color: string; depthColor: string}> = ({size, color, depthColor}) => (
  <div style={{position: 'relative', transformStyle: 'preserve-3d'}}>
    {Array.from({length: 8}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: 0, top: 0, transform: `translateZ(${-(i + 1) * 2}px)`}}>
        <Disp size={size} color={depthColor} weight={800}>
          ?
        </Disp>
      </div>
    ))}
    <Disp size={size} color={color} weight={800} style={{position: 'relative'}}>
      ?
    </Disp>
  </div>
);

// ---------------------------------------------------------------- neighbourhood map (illustrative)
export const Neighborhood: React.FC<{w: number; h: number; pins?: number; ownPin?: number; t?: number}> = ({w, h, pins = 0, ownPin = 1}) => {
  const blocks: Array<[number, number, number, number]> = [];
  for (let gx = 0; gx < 9; gx++) for (let gy = 0; gy < 9; gy++) blocks.push([40 + gx * 160, 40 + gy * 160, 120 + ((gx * 7 + gy * 3) % 3) * 6, 120]);
  const others: Array<[number, number]> = [
    [280, 300], [700, 210], [1100, 420], [420, 760], [960, 880], [200, 1150], [1240, 1180], [620, 1300], [1300, 640], [860, 520], [520, 980], [1080, 1340],
  ];
  return (
    <svg width={w} height={h} viewBox="0 0 1480 1480" preserveAspectRatio="xMidYMid slice" style={{display: 'block'}}>
      <rect width={1480} height={1480} fill="#1E3533" />
      {blocks.map(([x, y, bw, bh], i) => (
        <rect key={i} x={x} y={y} width={bw} height={bh} rx={14} fill={i % 11 === 3 ? 'rgba(183,216,197,0.2)' : 'rgba(183,216,197,0.07)'} />
      ))}
      <path d="M0 1080 C 380 1010, 620 1160, 980 1090 S 1380 1000, 1480 1050" stroke="rgba(23,97,90,0.95)" strokeWidth={56} fill="none" />
      <g stroke="rgba(183,216,197,0.3)" strokeWidth={14} fill="none">
        {[180, 500, 820, 1140].map((p) => (
          <React.Fragment key={p}>
            <path d={`M0 ${p} H1480`} />
            <path d={`M${p} 0 V1480`} />
          </React.Fragment>
        ))}
      </g>
      {others.map(([x, y], i) => {
        const p = Math.max(0, Math.min(1, pins * 14 - i));
        return p > 0 ? <circle key={i} cx={x} cy={y} r={20 * p} fill="rgba(183,216,197,0.55)" stroke="rgba(183,216,197,0.9)" strokeWidth={4} /> : null;
      })}
      {ownPin > 0 && (
        <g transform={`translate(740 740) scale(${ownPin})`}>
          <circle r={34} fill={C.amber} stroke={C.cream} strokeWidth={8} />
          <circle r={110} fill="none" stroke={C.amber} strokeWidth={4} strokeDasharray="12 14" opacity={0.7} />
        </g>
      )}
    </svg>
  );
};

/** Small 3D stack of coins (the owner's daydream). */
export const Coins: React.FC<{n: number; size: number}> = ({n, size}) => (
  <div style={{position: 'relative', width: size, height: size * 0.4 + n * size * 0.12}}>
    {Array.from({length: n}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: (i % 2) * 4, bottom: i * size * 0.12, width: size, height: size * 0.36, borderRadius: '50%', background: `linear-gradient(180deg, #E8B868, ${C.amber} 60%, #A9762F)`, boxShadow: 'inset 0 -6px 0 rgba(0,0,0,0.12)', display: 'grid', placeItems: 'center'}}>
        {i === n - 1 && <Disp size={size * 0.24} color="#8A5F22" weight={800}>$</Disp>}
      </div>
    ))}
  </div>
);
