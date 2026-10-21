#!/usr/bin/env node
// Regression checks for mock-api/server.js: path containment (raw, encoded,
// symlink, Windows-style separators, null bytes), generic error bodies, and CORS
// origin handling.
//
// The server is copied into a temp tree together with a canary file outside its
// data/ directory and a symlink inside data/ that points at the canary, so the
// repo's own mock-api/data is never modified. The real entrypoint is started as
// a child process on localhost:8000 (the port the server hardcodes), and the
// requests are sent with node's http module, which does not normalize paths.
//
// Usage: node scripts/mock-api-check.cjs
// Set MOCK_SERVER_FILE to check another copy of server.js (used to confirm these
// checks fail on the pre-fix code).

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const serverSrc = process.env.MOCK_SERVER_FILE
  ? path.resolve(process.env.MOCK_SERVER_FILE)
  : path.join(repoRoot, 'mock-api', 'server.js');
const PORT = 8000;
const CANARY = 'OUTSIDE-CANARY';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-mock-check-'));
const mockDir = path.join(tmp, 'mock-api');
const dataDir = path.join(mockDir, 'data');
fs.mkdirSync(path.join(dataDir, 'addresses'), { recursive: true });
fs.copyFileSync(serverSrc, path.join(mockDir, 'server.js'));
fs.writeFileSync(path.join(dataDir, 'tokens.json'), '{"ok":"INSIDE"}');
fs.writeFileSync(path.join(tmp, 'canary.json'), `{"secret":"${CANARY}"}`);
fs.symlinkSync(path.join(tmp, 'canary.json'), path.join(dataDir, 'leak.json'));

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `  (${detail})`}`);
};

// Sends one raw request. Returns { status, headers, body }.
const request = (rawPath, headers = {}) =>
  new Promise((resolve, reject) => {
    const req = http.request(
      { host: 'localhost', port: PORT, path: rawPath, method: 'GET', headers },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });

const leaked = (r) => r.body.includes(CANARY);

const waitForServer = (child) =>
  new Promise((resolve, reject) => {
    let out = '';
    const onData = (chunk) => {
      out += chunk;
      if (out.includes('Server is running')) resolve();
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => reject(new Error(`server exited early (${code}): ${out}`)));
    setTimeout(() => reject(new Error(`server did not start: ${out}`)), 5000);
  });

const main = async () => {
  const child = spawn(process.execPath, [path.join(mockDir, 'server.js')], {
    cwd: mockDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForServer(child);

    console.log('--- containment ---');
    const ok = await request('/tokens');
    check('legit file is served (200, INSIDE)', ok.status === 200 && ok.body.includes('INSIDE'), `status ${ok.status}`);

    for (const p of ['/../canary', '/../../canary', '/..%2Fcanary', '/%2e%2e/canary', '/%2e%2e%2fcanary', '/..%5ccanary', '/..;/canary', '/%2e%2e;/canary']) {
      const r = await request(p);
      check(`${p} does not serve the canary`, !leaked(r) && r.status !== 200, `status ${r.status}`);
    }

    const bs = await request('/..\\canary');
    check('backslash traversal does not serve the canary', !leaked(bs), `status ${bs.status}`);

    const nul = await request('/tokens%00.json');
    check('encoded null byte does not serve a file', nul.status !== 200, `status ${nul.status}`);

    const link = await request('/leak');
    check('symlink inside data/ pointing outside is refused', !leaked(link) && link.status === 403, `status ${link.status}`);

    console.log('--- error bodies ---');
    const missing = await request('/addresses/nope');
    check('404 body is generic', missing.status === 404 && missing.body === 'Not found', `status ${missing.status} body ${JSON.stringify(missing.body.slice(0, 120))}`);
    check('404 body has no server path', !missing.body.includes(tmp) && !missing.body.includes('/'), JSON.stringify(missing.body.slice(0, 120)));
    const forb = await request('/../canary');
    check('403 body is generic', forb.body === 'Forbidden', JSON.stringify(forb.body.slice(0, 120)));

    console.log('--- CORS ---');
    const local = await request('/tokens', { Origin: 'http://localhost:4200' });
    check('localhost origin is echoed', local.headers['access-control-allow-origin'] === 'http://localhost:4200', String(local.headers['access-control-allow-origin']));
    const evil = await request('/tokens', { Origin: 'https://evil.example.com' });
    check('foreign origin gets no ACAO header', evil.headers['access-control-allow-origin'] === undefined, String(evil.headers['access-control-allow-origin']));
    const noOrigin = await request('/tokens');
    check('no Origin gets no ACAO header', noOrigin.headers['access-control-allow-origin'] === undefined);
    const anyCreds = [ok, local, evil, noOrigin].some((r) => r.headers['access-control-allow-credentials'] !== undefined);
    check('Access-Control-Allow-Credentials is never sent', !anyCreds);
    const varies = [local, evil, noOrigin].every((r) => String(r.headers.vary || '').toLowerCase().includes('origin'));
    check('Vary: Origin is sent on every response (cache-safe)', varies, JSON.stringify([local.headers.vary, evil.headers.vary, noOrigin.headers.vary]));

    console.log('--- host (DNS rebinding) ---');
    const rebind = await request('/tokens', { Host: 'evil.example:8000' });
    check('foreign Host is refused (403, no data)', rebind.status === 403 && !rebind.body.includes('INSIDE'), `status ${rebind.status}`);
    const rebindOrigin = await request('/tokens', { Host: 'evil.example:8000', Origin: 'http://localhost:4200' });
    check('foreign Host is refused even with a localhost Origin', rebindOrigin.status === 403 && !rebindOrigin.body.includes('INSIDE'), `status ${rebindOrigin.status}`);
    const ip = await request('/tokens', { Host: '127.0.0.1:8000' });
    check('127.0.0.1 Host is served', ip.status === 200, `status ${ip.status}`);
  } catch (err) {
    failures++;
    console.log(`FAIL  ${err.message}`);
  } finally {
    child.kill();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
};

main();
