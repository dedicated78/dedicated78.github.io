import type { Platform, StrategyContent } from '../lib/types';
import { PLATFORMS } from '../lib/types';
import { PLATFORM_META } from '../lib/platforms';
import { lines } from '../lib/util';
import { IconPlus, IconX } from './Icons';

type Col<T> = { key: keyof T; label: string; kind?: 'text' | 'area' | 'number' | 'platform' | 'platformAll'; width?: string };

function RowList<T extends Record<string, unknown>>({ id, rows, cols, onChange, blank, addLabel }: { id: string; rows: T[]; cols: Col<T>[]; onChange: (r: T[]) => void; blank: T; addLabel: string }) {
  const set = (i: number, k: keyof T, v: unknown) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="rowlist">
      {rows.map((r, i) => (
        <div className="rowlist-row" key={i} style={{ gridTemplateColumns: `${cols.map((c) => c.width ?? '1fr').join(' ')} 36px` }}>
          {cols.map((c) => {
            const fid = `${id}-${i}-${String(c.key)}`;
            const label = <label htmlFor={fid} className="sr-only">{`${c.label} ${i + 1}`}</label>;
            const v = r[c.key];
            if (c.kind === 'platform' || c.kind === 'platformAll')
              return (
                <span key={String(c.key)}>
                  {label}
                  <select id={fid} value={String(v)} onChange={(e) => set(i, c.key, e.target.value)}>
                    {c.kind === 'platformAll' && <option value="all">All channels</option>}
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {PLATFORM_META[p].label}
                      </option>
                    ))}
                  </select>
                </span>
              );
            if (c.kind === 'number')
              return (
                <span key={String(c.key)}>
                  {label}
                  <input id={fid} type="number" min={0} max={21} value={Number(v)} onChange={(e) => set(i, c.key, Number(e.target.value))} />
                </span>
              );
            if (c.kind === 'area')
              return (
                <span key={String(c.key)}>
                  {label}
                  <textarea id={fid} rows={2} value={String(v ?? '')} placeholder={c.label} onChange={(e) => set(i, c.key, e.target.value)} />
                </span>
              );
            return (
              <span key={String(c.key)}>
                {label}
                <input id={fid} value={String(v ?? '')} placeholder={c.label} onChange={(e) => set(i, c.key, e.target.value)} />
              </span>
            );
          })}
          <button type="button" className="icon-btn" aria-label={`Remove row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            <IconX width={16} height={16} />
          </button>
        </div>
      ))}
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([...rows, { ...blank }])}>
        <IconPlus width={14} height={14} /> {addLabel}
      </button>
    </div>
  );
}

function ColHeads({ labels, widths }: { labels: string[]; widths: string[] }) {
  return (
    <div className="rowlist-head" aria-hidden="true" style={{ gridTemplateColumns: `${widths.join(' ')} 36px` }}>
      {labels.map((l) => (
        <span key={l}>{l}</span>
      ))}
    </div>
  );
}

function Section({ title, n, children }: { title: string; n: number; children: React.ReactNode }) {
  return (
    <section className="strat-section" aria-labelledby={`ss-${n}`}>
      <h3 id={`ss-${n}`}>
        <span className="sec-num">{String(n).padStart(2, '0')}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function StrategyEditor({ value, onChange }: { value: StrategyContent; onChange: (v: StrategyContent) => void }) {
  const set = <K extends keyof StrategyContent>(k: K, v: StrategyContent[K]) => onChange({ ...value, [k]: v });
  const listArea = (k: 'risks' | 'assumptions' | 'prohibitedTopics', label: string) => (
    <div className="field">
      <label htmlFor={`sl-${k}`}>{label}</label>
      <textarea id={`sl-${k}`} rows={4} value={value[k].join('\n')} onChange={(e) => set(k, lines(e.target.value))} aria-describedby={`sl-${k}-h`} />
      <small className="hint" id={`sl-${k}-h`}>
        One per line
      </small>
    </div>
  );
  return (
    <div className="strat-editor">
      <Section title="Objective & audience" n={1}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="st-obj">Campaign objective</label>
            <textarea id="st-obj" rows={3} value={value.objective} onChange={(e) => set('objective', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="st-aud">Target audience</label>
            <textarea id="st-aud" rows={3} value={value.audience} onChange={(e) => set('audience', e.target.value)} />
          </div>
        </div>
      </Section>
      <Section title="Brand message & content pillars" n={2}>
        <div className="field">
          <label htmlFor="st-msg">Brand message</label>
          <textarea id="st-msg" rows={2} value={value.brandMessage} onChange={(e) => set('brandMessage', e.target.value)} />
        </div>
        <ColHeads labels={['Pillar', 'Description']} widths={['1fr', '2fr']} />
        <RowList id="pil" rows={value.pillars} onChange={(r) => set('pillars', r)} blank={{ name: '', description: '' }} addLabel="Add pillar" cols={[{ key: 'name', label: 'Pillar' }, { key: 'description', label: 'Description', width: '2fr' }]} />
      </Section>
      <Section title="Channel roles" n={3}>
        <ColHeads labels={['Channel', 'Role', 'Formats']} widths={['140px', '2fr', '1fr']} />
        <RowList
          id="roles"
          rows={value.channelRoles}
          onChange={(r) => set('channelRoles', r)}
          blank={{ platform: 'instagram' as Platform, role: '', formats: '' }}
          addLabel="Add channel role"
          cols={[{ key: 'platform', label: 'Channel', kind: 'platform', width: '140px' }, { key: 'role', label: 'Role', kind: 'area', width: '2fr' }, { key: 'formats', label: 'Formats' }]}
        />
      </Section>
      <Section title="Posting cadence" n={4}>
        <ColHeads labels={['Channel', 'Posts / week', 'Times (HH:MM, comma-separated)', 'Notes']} widths={['140px', '110px', '1fr', '2fr']} />
        <RowList
          id="cad"
          rows={value.cadence}
          onChange={(r) => set('cadence', r)}
          blank={{ platform: 'x' as Platform, postsPerWeek: 3, bestTimes: '09:00', notes: '' }}
          addLabel="Add cadence"
          cols={[
            { key: 'platform', label: 'Channel', kind: 'platform', width: '140px' },
            { key: 'postsPerWeek', label: 'Posts per week', kind: 'number', width: '110px' },
            { key: 'bestTimes', label: 'Times' },
            { key: 'notes', label: 'Notes', width: '2fr' },
          ]}
        />
      </Section>
      <Section title="Campaign themes & example angles" n={5}>
        <ColHeads labels={['Theme', 'Angles (one per line)']} widths={['1fr', '2fr']} />
        <RowList id="themes" rows={value.themes} onChange={(r) => set('themes', r)} blank={{ title: '', angles: '' }} addLabel="Add theme" cols={[{ key: 'title', label: 'Theme' }, { key: 'angles', label: 'Angles', kind: 'area', width: '2fr' }]} />
      </Section>
      <Section title="Success metrics" n={6}>
        <ColHeads labels={['Channel', 'Metric', 'Target']} widths={['140px', '1fr', '1fr']} />
        <RowList
          id="metrics"
          rows={value.successMetrics}
          onChange={(r) => set('successMetrics', r)}
          blank={{ platform: 'all' as Platform | 'all', metric: '', target: '' }}
          addLabel="Add metric"
          cols={[{ key: 'platform', label: 'Channel', kind: 'platformAll', width: '140px' }, { key: 'metric', label: 'Metric' }, { key: 'target', label: 'Target' }]}
        />
      </Section>
      <Section title="Risks, assumptions & prohibited topics" n={7}>
        <div className="grid-3">
          {listArea('risks', 'Risks')}
          {listArea('assumptions', 'Assumptions')}
          {listArea('prohibitedTopics', 'Prohibited topics')}
        </div>
      </Section>
      <Section title="Recommended experiments" n={8}>
        <ColHeads labels={['Channel', 'Hypothesis', 'Test', 'Metric']} widths={['140px', '1.4fr', '1.4fr', '1fr']} />
        <RowList
          id="exp"
          rows={value.experiments}
          onChange={(r) => set('experiments', r)}
          blank={{ platform: 'all' as Platform | 'all', hypothesis: '', test: '', metric: '' }}
          addLabel="Add experiment"
          cols={[
            { key: 'platform', label: 'Channel', kind: 'platformAll', width: '140px' },
            { key: 'hypothesis', label: 'Hypothesis', kind: 'area', width: '1.4fr' },
            { key: 'test', label: 'Test', kind: 'area', width: '1.4fr' },
            { key: 'metric', label: 'Metric' },
          ]}
        />
      </Section>
    </div>
  );
}
