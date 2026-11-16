import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';
import {EZ, Q, lerp, pr} from '../timing';
import {Obj} from '../components/Card3D';
import {Txt} from '../props/Props';
import {EXAMPLE, ExampleCard, FIELDS_CARD, FieldsCard, KeyChip} from '../props/Ep07Props';
import {Studio, World} from './common';

// Lesson: incorrect vs correct name (fictional; assumes "Apex Roofing" is the genuine name) → the long
// name breaks into chips that land in the proper fields; promotional words aren't part of any field →
// keep the genuine name and accurate info (no ranking promise).

const FC = {x: 540, y: 820}; // fields card centre (screen = world here)
const rowY = (i: number) => FC.y - FIELDS_CARD.h / 2 + 84 + 49 + i * 110;
const VALUE_X = FC.x - FIELDS_CARD.w / 2 + 30 + 20 + 52 + 18 + 4;

type Chip = {label: string; field: number | null; at: number; sx: number; sy: number};

export const Lesson7: React.FC<{t: number}> = ({t}) => {
  const inP = pr(t, Q.lessonIn - 0.05, 0.35);
  const outP = pr(t, Q.lessonOut - 0.2, 0.35, EZ.in);
  // 1 · incorrect vs correct
  const exIn = pr(t, Q.L09 - 0.2, 0.5, EZ.back);
  const goodIn = pr(t, Q.L09 + 1.2, 0.5, EZ.back);
  const strike = pr(t, Q.shortcut - 0.1, 0.5, EZ.inOut);
  const exOut = pr(t, Q.L10 - 0.35, 0.4, EZ.in);
  // 2 · the name breaks apart into the right fields
  const fieldsIn = pr(t, Q.L10 - 0.2, 0.5, EZ.back);
  const split = pr(t, Q.L10 - 0.1, 0.35, EZ.back);
  const chips: Chip[] = [
    {label: 'Apex Roofing', field: 0, at: Q.L10 + 0.2, sx: 110, sy: 300},
    {label: 'Emergency Roof Repairs', field: 2, at: Q.services10, sx: 430, sy: 300},
    {label: 'Roofer', field: 1, at: Q.fields - 0.1, sx: 110, sy: 375},
    {label: '24/7', field: 3, at: Q.hours10, sx: 310, sy: 375},
    {label: 'Brooklyn', field: 4, at: Q.locations, sx: 460, sy: 375},
    {label: 'Best', field: null, at: Q.fields + 0.2, sx: 700, sy: 375},
    {label: 'Cheap', field: null, at: Q.fields + 0.3, sx: 380, sy: 450},
    {label: '#1', field: null, at: Q.fields + 0.4, sx: 570, sy: 450},
  ];
  const fill = [0, 1, 2, 3, 4].map((i) => pr(t, chips.find((c) => c.field === i)!.at + 0.32, 0.3));
  const check = [pr(t, Q.genuinely, 0.3), pr(t, Q.categories11, 0.3), pr(t, Q.services11, 0.3), pr(t, Q.information, 0.3), pr(t, Q.information + 0.2, 0.3)];
  const trayP = pr(t, Q.fields + 0.3, 0.4, EZ.back) * (1 - pr(t, Q.L11 + 0.3, 0.4, EZ.in));
  const noteA = pr(t, Q.genuinely + 0.5, 0.4);
  const noteB = pr(t, Q.information + 0.4, 0.4);
  return (
    <AbsoluteFill style={{opacity: inP * (1 - outP)}}>
      <Studio haloX={540} haloY={760} floorY={1600} />
      <World cam={{x: 540, y: 960, s: lerp(1.03, 1, pr(t, Q.lessonIn, 8, EZ.linear))}}>
        {exOut < 1 && (
          <>
            <Obj cx={540} cy={620} w={EXAMPLE.w} h={EXAMPLE.h} pose={{s: lerp(0.7, 1, exIn), z: lerp(-300, 0, exIn) - exOut * 300, rx: lerp(40, 4, exIn), ry: Math.sin(t * 0.8) * 2}}>
              <div style={{opacity: Math.min(1, exIn * 2) * (1 - exOut)}}>
                <ExampleCard good={false} strike={strike} />
              </div>
            </Obj>
            <Obj cx={540} cy={970} w={EXAMPLE.w} h={EXAMPLE.h} pose={{s: lerp(0.7, 1, goodIn), z: lerp(-300, 0, goodIn) - exOut * 300, rx: lerp(40, 4, goodIn), ry: Math.sin(t * 0.8 + 1) * 2}}>
              <div style={{opacity: Math.min(1, goodIn * 2) * (1 - exOut)}}>
                <ExampleCard good />
              </div>
            </Obj>
          </>
        )}
        {fieldsIn > 0.01 && (
          <Obj cx={FC.x} cy={FC.y} w={FIELDS_CARD.w} h={FIELDS_CARD.h} pose={{s: lerp(0.7, 1, fieldsIn), z: lerp(-300, 0, fieldsIn), rx: lerp(30, 3, fieldsIn), ry: Math.sin(t * 0.7) * 1.5}}>
            <div style={{opacity: Math.min(1, fieldsIn * 2)}}>
              <FieldsCard fill={fill} check={check} />
            </div>
          </Obj>
        )}
      </World>

      {/* the long name, then its pieces flying to their fields */}
      {t > Q.L10 - 0.4 && t < Q.L11 + 0.8 && (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', opacity: pr(t, Q.L10 - 0.4, 0.25) * (1 - split), transform: 'scale(0.8)'}}>
            <KeyChip label="Apex Roofing — Best Brooklyn Roofer — Emergency Roof Repairs — 24/7 — Cheap — #1" />
          </div>
          {chips.map((c) => {
            const fly = pr(t, c.at, 0.45, EZ.inOut);
            const tx = c.field === null ? ({Best: 330, Cheap: 490, '#1': 680} as Record<string, number>)[c.label] : VALUE_X;
            const ty = c.field === null ? 1262 : rowY(c.field) - 4;
            const x = lerp(c.sx, tx, fly);
            const y = lerp(c.sy, ty, fly) - Math.sin(Math.PI * fly) * 60;
            const land = c.field !== null ? 1 - pr(t, c.at + 0.32, 0.2) : 1 - pr(t, Q.L11 + 0.3, 0.4);
            return (
              <div key={c.label} style={{position: 'absolute', left: x, top: y - 26, opacity: split * land, transform: `scale(${lerp(1.35, c.field === null ? 0.9 : 0.95, fly)}) rotate(${c.field === null ? fly * ((c.label.length % 3) - 1) * 8 : 0}deg)`, transformOrigin: '0 50%'}}>
                <KeyChip label={c.label} tone={c.field === null ? 1 : 0} />
              </div>
            );
          })}
          {trayP > 0.01 && (
            <div style={{position: 'absolute', left: 0, right: 0, top: 1196, display: 'flex', justifyContent: 'center', opacity: trayP}}>
              <Txt size={22} weight={800} color="#9A6526" style={{letterSpacing: '0.12em'}}>
                PROMOTIONAL WORDS · NOT PART OF THE NAME
              </Txt>
            </div>
          )}
        </>
      )}
      {/* footnotes */}
      <div style={{position: 'absolute', left: 60, right: 60, top: exOut < 1 ? 1170 : 1190, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8}}>
        {exOut < 1 && (
          <div style={{opacity: goodIn * (1 - exOut)}}>
            <Txt size={22} weight={700} color={C.muted}>
              Fictional examples · assumes &quot;Apex Roofing&quot; is the business&apos;s real name
            </Txt>
          </div>
        )}
        {noteA > 0.01 && (
          <div style={{opacity: noteA}}>
            <Txt size={23} weight={700} color={C.charcoalSoft}>
              A service or place word is fine when it&apos;s genuinely part of the real name.
            </Txt>
          </div>
        )}
        {noteB > 0.01 && (
          <div style={{opacity: noteB}}>
            <Txt size={23} weight={700} color={C.muted}>
              Accurate info doesn&apos;t guarantee a top ranking.
            </Txt>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
