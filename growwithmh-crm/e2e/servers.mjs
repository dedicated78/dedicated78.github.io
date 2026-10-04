// Two tiny servers for the E2E run:
//  * gateway (:54321) — what supabase-js talks to: /rest → PostgREST, /auth → password-grant stand-in for GoTrue, /storage → files on disk
//  * app (:4173)      — static server for the production build (dist), hash routing so index.html only
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { cfg, sql } from './config.mjs';

fs.mkdirSync(cfg.storage, { recursive: true });

const b64 = (b) => Buffer.from(b).toString('base64url');
const sign = (payload) => {
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64(JSON.stringify(payload));
  return `${head}.${body}.${crypto.createHmac('sha256', cfg.jwtSecret).update(`${head}.${body}`).digest('base64url')}`;
};
const esc = (s) => String(s).replace(/'/g, "''");

const userByEmail = (email) => {
  const row = sql(`select id, email from auth.users where lower(email) = lower('${esc(email)}')`);
  if (!row) return null;
  const [id, em] = row.split('|');
  return { id, email: em };
};
const userObj = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() });
const session = (u) => {
  const now = Math.floor(Date.now() / 1000);
  const access = sign({ sub: u.id, role: 'authenticated', aud: 'authenticated', email: u.email, iat: now, exp: now + 3600 });
  return { access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: b64(u.id), user: userObj(u) };
};

const readBody = (req) => new Promise((res) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => res(Buffer.concat(c))); });
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' };
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', ...CORS }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

  if (url.pathname.startsWith('/rest/v1/')) {
    const body = await readBody(req);
    const headers = { ...req.headers, host: `localhost:${cfg.restPort}` };
    delete headers['content-length'];
    const pr = http.request({ host: 'localhost', port: cfg.restPort, method: req.method, path: url.pathname.replace('/rest/v1', '') + url.search, headers: { ...headers, 'content-length': body.length } }, (r) => {
      res.writeHead(r.statusCode, { ...r.headers, ...CORS });
      r.pipe(res);
    });
    pr.on('error', (e) => json(res, 502, { message: String(e) }));
    return pr.end(body);
  }

  if (url.pathname === '/auth/v1/token') {
    const body = JSON.parse((await readBody(req)).toString() || '{}');
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const u = userByEmail(body.email || '');
      if (!u || body.password !== cfg.password) return json(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      return json(res, 200, session(u));
    }
    if (grant === 'refresh_token') {
      const id = Buffer.from(body.refresh_token || '', 'base64url').toString().replace(/[^0-9a-f-]/g, '');
      const row = sql(`select id, email from auth.users where id = '${id}'`);
      if (!row) return json(res, 400, { error: 'invalid_grant' });
      const [uid, em] = row.split('|');
      return json(res, 200, session({ id: uid, email: em }));
    }
  }
  if (url.pathname === '/auth/v1/user') {
    await readBody(req);
    const tok = (req.headers.authorization || '').replace('Bearer ', '');
    const payload = JSON.parse(Buffer.from(tok.split('.')[1] || 'e30', 'base64url').toString());
    return json(res, 200, userObj({ id: payload.sub, email: payload.email }));
  }
  if (url.pathname === '/auth/v1/logout') { await readBody(req); res.writeHead(204, CORS); return res.end(); }

  if (url.pathname.startsWith('/storage/v1/')) {
    const rel = decodeURIComponent(url.pathname.replace('/storage/v1/', ''));
    if (req.method === 'POST' && rel.startsWith('object/sign/')) {
      await readBody(req);
      return json(res, 200, { signedURL: `/object/${rel.slice('object/sign/'.length)}?token=x&download=1` });
    }
    if (req.method === 'POST' && rel.startsWith('object/')) {
      const raw = await readBody(req);
      const file = path.join(cfg.storage, rel.slice('object/'.length));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      let data = raw;
      if ((req.headers['content-type'] || '').startsWith('multipart/form-data')) {
        // supabase-js sends multipart for Blob uploads: keep only the file part
        const s = raw.toString('utf8');
        const m = /\r\n\r\n([\s\S]*)\r\n--[^\r\n]+--\r\n?$/.exec(s.slice(s.indexOf('filename') > -1 ? s.indexOf('filename') : 0));
        if (m) data = Buffer.from(m[1]);
      }
      fs.writeFileSync(file, data);
      return json(res, 200, { Key: rel.slice('object/'.length), Id: crypto.randomUUID() });
    }
    if (req.method === 'DELETE') {
      const b = JSON.parse((await readBody(req)).toString() || '{}');
      for (const p of b.prefixes || []) fs.rmSync(path.join(cfg.storage, 'prospect-reports', p), { force: true });
      return json(res, 200, []);
    }
    if (req.method === 'GET' && rel.startsWith('object/')) {
      const file = path.join(cfg.storage, rel.slice('object/'.length));
      if (!fs.existsSync(file)) return json(res, 404, { message: 'not found' });
      res.writeHead(200, { ...CORS, 'content-type': 'text/markdown', 'content-disposition': `attachment; filename="${path.basename(file)}"` });
      return res.end(fs.readFileSync(file));
    }
  }
  json(res, 404, { message: `no route ${req.method} ${url.pathname}` });
}).listen(cfg.gatewayPort, '127.0.0.1', () => console.log(`gateway on ${cfg.gatewayPort}`));

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.md': 'text/markdown', '.json': 'application/json' };
http.createServer((req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  let file = path.join(cfg.dist, path.normalize(p).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(cfg.dist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(cfg.dist, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(cfg.appPort, '127.0.0.1', () => console.log(`app on ${cfg.appPort}`));
