import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

// Only the public anon key ever reaches the browser. Row Level Security does the real access control.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-anon-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Hash routing owns the URL fragment; password sign-in does not need URL session detection.
    detectSessionInUrl: false,
  },
});

interface PgResult<T> {
  data: T | null;
  error: { message: string } | null;
}

/** Throw a readable Error if a Supabase call failed, otherwise return its data. */
export function unwrap<T>(res: PgResult<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const PAGE = 1000; // Supabase's default max rows per request

/** Read every row of a query by paging through it (PostgREST caps a single response at 1000 rows). */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<PgResult<T[]>>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = unwrap(await build(from, from + PAGE - 1)) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : typeof e === 'string' ? e : 'Something went wrong');
