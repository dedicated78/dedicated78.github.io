// Node-side view of the same settings env.sh exports (defaults must match env.sh).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const num = (v, d) => Number(v ?? d);

export const cfg = {
  root: here,
  appRoot: path.resolve(here, '..'),
  tmp: process.env.E2E_TMP ?? path.join(here, '.tmp'),
  pgPort: num(process.env.E2E_PG_PORT, 54329),
  pgSocketDir: process.env.E2E_PG_SOCKET_DIR ?? '/tmp',
  db: process.env.E2E_DB ?? 'crm_e2e',
  restPort: num(process.env.E2E_REST_PORT, 54330),
  gatewayPort: num(process.env.E2E_GATEWAY_PORT, 54321),
  appPort: num(process.env.E2E_APP_PORT, 4173),
  jwtSecret: process.env.E2E_JWT_SECRET ?? 'e2e-secret-e2e-secret-e2e-secret-1234',
  password: 'test1234', // every demo account
};
cfg.storage = path.join(cfg.tmp, 'storage');
cfg.dist = path.join(cfg.tmp, 'dist');
cfg.shots = path.join(cfg.tmp, 'shots');
cfg.baseUrl = `http://127.0.0.1:${cfg.appPort}/#`;

/** Run SQL against the E2E database as the superuser; returns trimmed stdout (pipe-separated columns). */
export function sql(query) {
  return execFileSync('psql', ['-h', cfg.pgSocketDir, '-p', String(cfg.pgPort), '-U', 'postgres', '-d', cfg.db, '-v', 'ON_ERROR_STOP=1', '-qAt', '-F', '|', '-c', query], { encoding: 'utf8' }).trim();
}

export function findChromium() {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  const bases = [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers', path.join(process.env.HOME ?? '', '.cache/ms-playwright')].filter(Boolean);
  for (const base of bases) {
    if (!fs.existsSync(base)) continue;
    for (const d of fs.readdirSync(base).sort().reverse()) {
      for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
        const p = path.join(base, d, rel);
        if (d.startsWith('chromium') && !d.includes('headless') && fs.existsSync(p)) return p;
      }
    }
  }
  throw new Error('No Chromium found. Set E2E_CHROMIUM=/path/to/chrome (Playwright chromium works).');
}
