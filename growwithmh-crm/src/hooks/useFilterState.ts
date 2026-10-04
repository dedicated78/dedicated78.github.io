import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Filter state that lives in React state (so inputs stay instantly responsive) and is mirrored into the URL,
 * so filtered views are linkable (dashboard cards link to them) and survive a refresh.
 */
export function useFilterState<T extends Record<string, string>>(defaults: T) {
  const [params, setParams] = useSearchParams();
  const defaultsRef = useRef(defaults);
  const [state, setState] = useState<T>(() => {
    const initial = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = params.get(key);
      if (v !== null) (initial as Record<string, string>)[key] = v;
    }
    return initial;
  });

  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;

  useEffect(() => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(state)) {
      if (v && v !== defaultsRef.current[k]) next.set(k, v);
    }
    setParamsRef.current(next, { replace: true });
  }, [state]);

  const set = useCallback(<K extends keyof T>(key: K, value: string) => setState((s) => ({ ...s, [key]: value })), []);
  const reset = useCallback(() => setState({ ...defaultsRef.current }), []);
  return { state, set, reset };
}
