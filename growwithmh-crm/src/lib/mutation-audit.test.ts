// Static guard against accidental broad mutations.
//
// PostgREST does NOT reject an UPDATE/DELETE that has no row filter: `PATCH /leads` with no query string updates
// every row the caller's RLS lets them see (for an admin: all of them). RLS stays the authorization boundary, but
// nothing may rely on it to stop an unfiltered request. So every direct table mutation in the frontend must be:
//   .from('<table>').update(...)|.delete()  →  .eq('id', <that record's id>)  →  .select(...)  →  .single()
// `.single()` also makes PostgREST roll the statement back unless exactly one row was affected.
//
// If you add a mutation, this test fails on purpose: review it, then add it to EXPECTED below.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..');
const MIGRATIONS = join(SRC, '..', 'supabase', 'migrations');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length)).replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

const sources = walk(SRC)
  .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f))
  .map((f) => ({ file: relative(SRC, f).replace(/\\/g, '/'), code: stripComments(readFileSync(f, 'utf8')) }));

/** Text of the call chain that follows index `from` (inside an `unwrap(await …)`), up to its closing paren or `;`. */
function chainAfter(code: string, from: number): string {
  let depth = 0;
  for (let i = from; i < code.length; i++) {
    const c = code[i];
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) {
      depth--;
      if (depth < 0) return code.slice(from, i);
    } else if (c === ';' && depth === 0) return code.slice(from, i);
  }
  return code.slice(from);
}

interface Mutation {
  file: string;
  table: string;
  op: 'update' | 'delete';
  chain: string;
}

function findMutations(): Mutation[] {
  const found: Mutation[] = [];
  for (const { file, code } of sources) {
    for (const m of code.matchAll(/\.(update|delete)\(/g)) {
      const idx = m.index!;
      const fromIdx = code.lastIndexOf(".from('", idx);
      const between = fromIdx === -1 ? '' : code.slice(fromIdx, idx);
      const table = /^\.from\('([a-z_]+)'\)/.exec(between)?.[1] ?? '?';
      found.push({ file, table, op: m[1] as 'update' | 'delete', chain: chainAfter(code, idx) });
    }
  }
  return found;
}

// Every direct mutation the app is allowed to make, and the filter that scopes it.
const EXPECTED: { file: string; table: string; op: 'update' | 'delete'; filter: RegExp }[] = [
  { file: 'features/leads/api.ts', table: 'leads', op: 'update', filter: /\.eq\('id', id\)/ },
  { file: 'features/deals/api.ts', table: 'deals', op: 'update', filter: /\.eq\('id', id\)/ },
  { file: 'features/clients/api.ts', table: 'clients', op: 'update', filter: /\.eq\('id', id\)/ },
  { file: 'features/clients/api.ts', table: 'client_access', op: 'update', filter: /\.eq\('id', id\)/ },
  { file: 'features/clients/api.ts', table: 'clients', op: 'delete', filter: /\.eq\('id', id\)/ },
  { file: 'features/settings/api.ts', table: 'profiles', op: 'update', filter: /\.eq\('id', id\)/ },
  // single-row settings table: the id is the constant 1 (and the table has CHECK (id = 1))
  { file: 'features/settings/api.ts', table: 'app_settings', op: 'update', filter: /\.eq\('id', 1\)/ },
];

describe('frontend mutations are always scoped to one record', () => {
  const mutations = findMutations();

  it('finds exactly the expected set of direct UPDATE/DELETE calls', () => {
    const key = (m: { file: string; table: string; op: string }) => `${m.file} ${m.op} ${m.table}`;
    expect(mutations.map(key).sort()).toEqual(EXPECTED.map(key).sort());
  });

  for (const exp of EXPECTED) {
    it(`${exp.op} ${exp.table} (${exp.file}) has a primary-key filter, a returned row and .single()`, () => {
      const m = mutations.find((x) => x.file === exp.file && x.table === exp.table && x.op === exp.op)!;
      expect(m, 'mutation not found').toBeDefined();
      expect(m.chain).toMatch(exp.filter);
      // the filter must come first-class in the chain, not only inside a comment or a different query
      expect(m.chain).not.toMatch(/\.(neq|in|or|not|is|like|ilike|gt|gte|lt|lte|match|filter)\(/);
      expect(m.chain).toMatch(/\.select\(/);
      expect(m.chain).toMatch(/\.single\(\)/);
      // the filter has to be applied before the request is awaited: i.e. before .select()/.single()
      expect(m.chain.search(exp.filter)).toBeLessThan(m.chain.search(/\.select\(/));
    });
  }

  it('only the clients table can be deleted from the browser (leads, reports, activities, deals are archive/immutable)', () => {
    expect(mutations.filter((m) => m.op === 'delete').map((m) => m.table)).toEqual(['clients']);
  });

  it('never uses upsert, truncate, raw REST/fetch calls or rpc names outside the reviewed set', () => {
    const all = sources.map((s) => s.code).join('\n');
    expect(all).not.toMatch(/\.upsert\(/);
    expect(all).not.toMatch(/truncate\s+table|\.truncate\(/i);
    expect(all).not.toMatch(/\bfetch\(/);
    expect(all).not.toMatch(/\/rest\/v1/);
    const rpcs = [...all.matchAll(/\.rpc\(\s*'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(rpcs).toEqual(['add_report_version', 'convert_deal_to_client', 'create_lead_with_report', 'hand_off_to_bd', 'log_activity']);
  });

  it('inserts happen only for a new lead (everything else is created by RPCs)', () => {
    const inserts = sources.flatMap(({ file, code }) => [...code.matchAll(/\.from\('([a-z_]+)'\)\s*\.insert\(/g)].map((m) => `${file} ${m[1]}`));
    expect(inserts).toEqual(['features/leads/api.ts leads']);
  });

  it('storage removals name explicit object paths only', () => {
    const removals = sources.flatMap(({ code }) => [...code.matchAll(/\.remove\(([^)]*)\)/g)].map((m) => m[1].trim()));
    expect(removals.length).toBeGreaterThan(0);
    for (const arg of removals) expect(arg).toMatch(/^\[(path|uploaded)\]$/);
  });

  it('shared helpers in lib/supabase.ts cannot mutate', () => {
    const helper = sources.find((s) => s.file === 'lib/supabase.ts')!.code;
    expect(helper).not.toMatch(/\.(update|delete|insert|upsert|rpc)\(/);
  });

  it('the generic query-builder helpers are read-only', () => {
    const all = sources.map((s) => s.code).join('\n');
    // fetchAll takes a builder callback; make sure no caller passes a mutation into it
    for (const m of all.matchAll(/fetchAll<[^>]+>\(([\s\S]*?)\)\s*,?\s*\n/g)) expect(m[1]).not.toMatch(/\.(update|delete|insert|upsert)\(/);
  });
});

describe('database functions and triggers never run an unfiltered UPDATE/DELETE', () => {
  const sql = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => ({ f, text: readFileSync(join(MIGRATIONS, f), 'utf8').replace(/--[^\n]*/g, '') }));

  it('every UPDATE/DELETE statement has a WHERE clause', () => {
    const offenders: string[] = [];
    let seen = 0;
    for (const { f, text } of sql) {
      for (const m of text.matchAll(/(?:^|;|\bbegin\b|\bthen\b|\belse\b|\bloop\b)\s*((?:update\s+public\.\w+|delete\s+from\s+public\.\w+)[\s\S]*?);/gi)) {
        seen++;
        if (!/\bwhere\b/i.test(m[1])) offenders.push(`${f}: ${m[1].replace(/\s+/g, ' ').slice(0, 80)}`);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(10); // guards against the regex silently matching nothing
    expect(offenders).toEqual([]);
  });

  it('every WHERE scopes by record id (never a bare predicate on a shared column)', () => {
    for (const { f, text } of sql) {
      for (const m of text.matchAll(/(?:^|;|\bbegin\b|\bthen\b|\belse\b|\bloop\b)\s*((?:update\s+public\.\w+|delete\s+from\s+public\.\w+)[\s\S]*?);/gi)) {
        expect(m[1], f).toMatch(/\bwhere\s+id\s*=/i);
      }
    }
  });
});
