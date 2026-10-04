import { useState } from 'react';

/**
 * Form state seeded from server data. When the server copy changes underneath (e.g. an activity updates the next
 * action), only the fields that actually changed are merged in — anything else the user is typing is left alone.
 */
export function useSyncedForm<T extends object>(baseline: T) {
  const [form, setForm] = useState<T>(baseline);
  const [prev, setPrev] = useState<T>(baseline);

  if (prev !== baseline) {
    const merged = { ...form };
    let changed = false;
    for (const key of Object.keys(baseline) as (keyof T)[]) {
      if (baseline[key] !== prev[key] && merged[key] !== baseline[key]) {
        merged[key] = baseline[key];
        changed = true;
      }
    }
    setPrev(baseline);
    if (changed) setForm(merged);
  }

  const dirty = (Object.keys(baseline) as (keyof T)[]).some((k) => form[k] !== baseline[k]);
  return { form, setForm, dirty, reset: () => setForm(baseline) };
}
