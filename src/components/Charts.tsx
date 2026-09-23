import { useMemo, useRef, useState } from 'react';
import { fmtDate, fmtNum } from '../lib/util';

export interface Series {
  key: string;
  label: string;
  color: string;
  points: { date: Date; value: number | null }[];
}

/** Multi-series line chart: one y-axis, 2px lines, crosshair tooltip, legend + direct end labels. */
export function LineChart({ series, height = 240, valueLabel }: { series: Series[]; height?: number; valueLabel: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { l: 48, r: 92, t: 12, b: 28 };
  const n = Math.max(0, ...series.map((s) => s.points.length));
  const max = useMemo(() => {
    const m = Math.max(0, ...series.flatMap((s) => s.points.map((p) => p.value ?? 0)));
    if (m === 0) return 1;
    const mag = 10 ** Math.floor(Math.log10(m));
    return Math.ceil(m / mag) * mag;
  }, [series]);
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, max / 2, max];
  const dates = series[0]?.points.map((p) => p.date) ?? [];
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  const onMove = (e: React.PointerEvent) => {
    const rect = wrap.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1));
    setHover(i >= 0 && i < n ? i : null);
  };

  // Direct end labels, nudged apart to avoid collisions.
  const ends = series
    .map((s) => {
      const last = [...s.points].reverse().find((p) => p.value !== null);
      return last ? { s, y: y(last.value!) } : null;
    })
    .filter(Boolean) as { s: Series; y: number }[];
  ends.sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;

  return (
    <div className="chart" ref={wrap} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${valueLabel} over time for ${series.map((s) => s.label).join(', ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="axis">
              {fmtNum(t)}
            </text>
          </g>
        ))}
        {dates.map((d, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="axis">
              {fmtDate(d.toISOString())}
            </text>
          ) : null,
        )}
        {series.map((s) => {
          const segs: string[] = [];
          let cur = '';
          s.points.forEach((p, i) => {
            if (p.value === null) {
              if (cur) segs.push(cur);
              cur = '';
            } else cur += `${cur ? 'L' : 'M'}${x(i)},${y(p.value)}`;
          });
          if (cur) segs.push(cur);
          return segs.map((d, j) => <path key={s.key + j} d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />);
        })}
        {ends.map(({ s, y: ly }) => (
          <text key={s.key} x={W - pad.r + 8} y={ly + 4} className="direct-label">
            {s.label}
          </text>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="crosshair" />
            {series.map((s) =>
              s.points[hover]?.value !== null && s.points[hover] ? <circle key={s.key} cx={x(hover)} cy={y(s.points[hover].value!)} r={4.5} fill={s.color} stroke="var(--surface)" strokeWidth={2} /> : null,
            )}
          </g>
        )}
      </svg>
      {hover !== null && dates[hover] && (
        <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
          <strong>{dates.length > 1 && dates[1].getTime() - dates[0].getTime() >= 6 * 86400000 ? 'Week of ' : ''}{fmtDate(dates[hover].toISOString())}</strong>
          {series.map((s) => (
            <div key={s.key} className="tt-row">
              <span className="tt-swatch" style={{ background: s.color }} aria-hidden="true" />
              {s.label}: <b>{fmtNum(s.points[hover]?.value ?? null)}</b>
            </div>
          ))}
        </div>
      )}
      {series.length >= 2 && <Legend items={series} />}
    </div>
  );
}

export function Legend({ items }: { items: { key: string; label: string; color: string }[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {items.map((i) => (
        <li key={i.key}>
          <span className="tt-swatch" style={{ background: i.color }} aria-hidden="true" />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export interface BarRow {
  group: string;
  values: { key: string; label: string; color: string; value: number | null; detail?: string }[];
}

/** Horizontal grouped bars, one scale, values labelled in text ink, "Not available" for missing metrics. */
export function BarChart({ rows, valueLabel }: { rows: BarRow[]; valueLabel: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.flatMap((r) => r.values.map((v) => v.value ?? 0)));
  const legend = rows[0]?.values.map((v) => ({ key: v.key, label: v.label, color: v.color })) ?? [];
  return (
    <div className="bars" role="table" aria-label={valueLabel}>
      {rows.map((r) => (
        <div className="bar-group" role="row" key={r.group}>
          <div className="bar-group-label" role="rowheader">
            {r.group}
          </div>
          <div className="bar-stack">
            {r.values.map((v) => {
              const id = r.group + v.key;
              return (
                <div className="bar-line" key={v.key} role="cell" onPointerEnter={() => setHover(id)} onPointerLeave={() => setHover(null)}>
                  {v.value === null ? (
                    <span className="bar-na">
                      {v.label}: Not available
                    </span>
                  ) : (
                    <>
                      <span className="bar" style={{ width: `${Math.max(1, (v.value / max) * 100)}%`, background: v.color }} aria-hidden="true" />
                      <span className="bar-val">
                        {legend.length > 1 && <span className="sr-only">{v.label}: </span>}
                        {fmtNum(v.value)}
                      </span>
                    </>
                  )}
                  {hover === id && v.value !== null && (
                    <div className="tooltip tooltip-inline" role="status">
                      <strong>
                        {r.group} · {v.label}
                      </strong>
                      <div>
                        {valueLabel}: <b>{fmtNum(v.value)}</b>
                      </div>
                      {v.detail && <div className="muted">{v.detail}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {legend.length > 1 && <Legend items={legend} />}
    </div>
  );
}
