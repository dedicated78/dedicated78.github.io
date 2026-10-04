import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { cfg, findChromium } from './config.mjs';

export { sql } from './config.mjs';
export const BASE = cfg.baseUrl;
export const SHOTS = cfg.shots;
fs.mkdirSync(SHOTS, { recursive: true });

// ---- network mutation audit: every PATCH/PUT/DELETE the UI sends to PostgREST must target ONE record by primary key
export const mutationLog = [];
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function auditRequest(r) {
  const u = new URL(r.url());
  if (!u.pathname.startsWith('/rest/v1/')) return;
  const m = r.method();
  if (m === 'PATCH' || m === 'PUT' || m === 'DELETE') {
    const table = u.pathname.replace('/rest/v1/', '');
    const id = u.searchParams.get('id');
    const ok =
      new RegExp(`^eq\\.(${UUID}|1)$`).test(id || '') &&
      [...u.searchParams.keys()].filter((k) => !['select', 'id'].includes(k)).length === 0 &&
      (r.headers()['accept'] || '').includes('vnd.pgrst.object+json');
    mutationLog.push({ method: m, table, filter: id ? `id=${id.replace(new RegExp(UUID), '<uuid>')}` : '(none)', ok });
  }
  if (m === 'POST' && u.pathname.startsWith('/rest/v1/rpc/')) mutationLog.push({ method: 'RPC', table: u.pathname.replace('/rest/v1/rpc/', ''), filter: '-', ok: true });
  if (m === 'POST' && !u.pathname.startsWith('/rest/v1/rpc/')) mutationLog.push({ method: 'INSERT', table: u.pathname.replace('/rest/v1/', ''), filter: '-', ok: u.pathname === '/rest/v1/leads' });
}

export async function launch() {
  return chromium.launch({ executablePath: findChromium(), args: ['--no-sandbox'] });
}

/** Noise we deliberately ignore: Google Fonts is unreachable/untrusted in sandboxed runners. */
const IGNORED = /fonts\.g(oogleapis|static)\.com|ERR_CERT_AUTHORITY_INVALID|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_TUNNEL|Failed to load resource: net::ERR_/;

export async function newPage(browser, { mobile = false } = {}) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1360, height: 900 } });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !IGNORED.test(m.text())) problems.push(`[console.${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => { if (!IGNORED.test(r.url() + (r.failure()?.errorText ?? ''))) problems.push(`[requestfailed] ${r.method()} ${r.url()} ${r.failure()?.errorText}`); });
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('/auth/v1/') && !IGNORED.test(r.url())) problems.push(`[http ${r.status()}] ${r.request().method()} ${r.url().slice(0, 140)}`); });
  page.on('request', auditRequest);
  page.problems = problems;
  return page;
}

export async function login(page, email) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(cfg.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/#\/dashboard/);
}

export const shot = (page, name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

let failed = 0;
let passed = 0;
export function check(cond, label) {
  if (cond) { passed++; console.log('  ✓', label); } else { failed++; console.log('  ✗ FAIL', label); }
}

/** Fail the scenario on any unexpected console error / failed request, then print the audit and the verdict. */
export function summary(pages = []) {
  for (const [name, pg] of pages) {
    check(pg.problems.length === 0, `no unexpected console errors or failed requests (${name})${pg.problems.length ? ': ' + pg.problems.slice(0, 3).join(' | ') : ''}`);
  }
  const kinds = new Map();
  for (const m of mutationLog) {
    const k = `${m.method.padEnd(6)} ${m.table.padEnd(28)} ${m.filter}${m.ok ? '' : '   <-- UNSAFE'}`;
    kinds.set(k, (kinds.get(k) || 0) + 1);
  }
  console.log('\nnetwork mutation audit (distinct requests × count):');
  for (const [k, n] of [...kinds].sort()) console.log('  ', k, `× ${n}`);
  const bad = mutationLog.filter((m) => !m.ok).length;
  const checked = mutationLog.filter((m) => m.method === 'PATCH' || m.method === 'DELETE').length;
  check(bad === 0, `every PATCH/DELETE targeted exactly one record by primary key with a single-row response (${checked} checked, ${bad} unsafe)`);
  console.log(`\n${passed} passed, ${failed} failed`);
  return failed;
}
