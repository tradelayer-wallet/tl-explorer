#!/usr/bin/env node
// Regression checks for the API input layer and external link rendering from
// the adversarial security reviews.
//
// Runs with plain node against the real source files: TypeScript is transpiled
// with the repo's own typescript package and evaluated with the Angular imports
// stubbed out. Assertions go through the public TradeLayerApi methods and watch
// the URLs handed to HttpClient, so they test what is actually requested.
//
// Usage: node scripts/safe-id-sanity-check.cjs
// Set TL_API_SERVICE_FILE to run the same API checks against another revision
// of tl-api.service.ts (used to confirm these checks fail on the pre-fix code).

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');
const { execFileSync } = require('child_process');
const ts = require('typescript');
const { of, throwError } = require(path.join(__dirname, '..', 'node_modules', 'rxjs'));

const repoRoot = path.resolve(__dirname, '..');
const servicePath = process.env.TL_API_SERVICE_FILE
  ? path.resolve(process.env.TL_API_SERVICE_FILE)
  : path.join(repoRoot, 'src/app/@core/api/tl-api.service.ts');
const safeLinkPath = path.join(repoRoot, 'src/app/@core/safe-link.ts');
const lookupPath = path.join(repoRoot, 'src/app/@core/lookup-value.ts');
const propertyTypesPath = path.join(repoRoot, 'src/app/@components/property-types.ts');

const API_URL = 'http://localhost:3000';
const TXID = 'a'.repeat(64);
const ADDR = 'LcXYZabc1234567890';

// Loads a TypeScript file as CommonJS, with the given module stubs.
const loadTs = (file, stubs) => {
  const source = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      experimentalDecorators: true,
    },
    fileName: file,
  }).outputText;

  const mod = new Module(file, null);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.join(repoRoot, 'node_modules'));
  const realRequire = mod.require.bind(mod);
  mod.require = (id) =>
    Object.prototype.hasOwnProperty.call(stubs, id) ? stubs[id] : realRequire(id);
  mod._compile(js, file);
  return mod.exports;
};

let failures = 0;
const check = (label, actual, expected) => {
  const ok = Object.is(actual, expected)
    || (typeof expected === 'object' && JSON.stringify(actual) === JSON.stringify(expected));
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}` +
      (ok ? '' : `  (expected ${JSON.stringify(expected)})`),
  );
};

// ---------------------------------------------------------------------------
// API layer: every request URL is built from validated parts or not sent at all.
// ---------------------------------------------------------------------------

const lookupModule = loadTs(lookupPath, {});

const { TradeLayerApi } = loadTs(servicePath, {
  'src/app/@core/lookup-value': lookupModule,
  '@angular/core': { Injectable: () => (target) => target },
  '@angular/common/http': { HttpClient: class {} },
  '@angular/router': { Router: class {} },
  'src/environments/environment': { environment: { apiUrl: API_URL } },
});

if (typeof TradeLayerApi !== 'function') {
  console.error('FAIL: TradeLayerApi could not be loaded from', servicePath);
  process.exit(1);
}

let requested = [];
let navigations = [];
let httpResponse = () => of({ ok: true });
const fakeHttp = { get: (url) => { requested.push(url); return httpResponse(url); } };
const fakeRouter = { navigate: (commands, extras) => { navigations.push({ commands, extras }); return Promise.resolve(true); } };
const api = new TradeLayerApi(fakeHttp, fakeRouter);

// Runs one API call and records what happened.
const run = (fn) => {
  requested = [];
  navigations = [];
  const emitted = [];
  let completed = false;
  fn().subscribe({ next: (v) => emitted.push(v), complete: () => { completed = true; } });
  return { requested: requested.slice(), navigated: navigations.map((n) => n.commands.join('/')), emitted, completed };
};

const expectUrl = (label, fn, pathAndQuery) => {
  const r = run(fn);
  check(label, r.requested, [API_URL + pathAndQuery]);
  check(`${label}: no error navigation`, r.navigated.length, 0);
};

const expectRejected = (label, fn) => {
  const r = run(fn);
  check(`${label}: no request sent`, r.requested.length, 0);
  check(`${label}: navigates to error page once`, r.navigated, ['error']);
  check(`${label}: emits nothing`, r.emitted.length, 0);
  check(`${label}: completes`, r.completed, true);
};

console.log('--- address segments (ADDRESS_RE: [A-Za-z0-9]{10,120}) ---');
expectUrl('getBalance(valid address)', () => api.getBalance(ADDR), `/tl_getAllBalancesForAddress/${ADDR}`);
expectUrl('validateAddress(valid address)', () => api.validateAddress(ADDR), `/addresses/${ADDR}/validate/`);
expectRejected('getBalance("../../x") traversal', () => api.getBalance('../../x'));
expectRejected('getBalance("..%2F..%2Fx") encoded traversal', () => api.getBalance('..%2F..%2Fx'));
expectRejected('getBalance("%2e%2e") encoded dots', () => api.getBalance('%2e%2e%2fx'));
expectRejected('getBalance with query "?x=1"', () => api.getBalance(`${ADDR}?x=1`));
expectRejected('getBalance with fragment "#x"', () => api.getBalance(`${ADDR}#x`));
expectRejected('getBalance with backslash', () => api.getBalance(`${ADDR}\\..\\x`));
expectRejected('getBalance with trailing newline', () => api.getBalance(`${ADDR}\n`));
expectRejected('getBalance with whitespace', () => api.getBalance(` ${ADDR} `));
expectRejected('getBalance with fullwidth digits/letters', () => api.getBalance('ＬｃＸＹＺabc1234567'));
expectRejected('getBalance too short (9 chars)', () => api.getBalance('abcdefghi'));
expectRejected('getBalance too long (121 chars)', () => api.getBalance('a'.repeat(121)));
expectRejected('getBalance with null byte', () => api.getBalance(`${ADDR}\u0000`));
expectRejected('getBalance with non-string (number)', () => api.getBalance(12345678901));
expectRejected('getBalance with undefined', () => api.getBalance(undefined));
expectRejected('getBalance with array', () => api.getBalance([ADDR]));
expectRejected('getTransactionsForAddress("../x")', () => api.getTransactionsForAddress('../x'));
expectRejected('getUnvestedBalance("a/b")', () => api.getUnvestedBalance('abcdefghij/x'));

console.log('--- txid segments (TXID_RE: 64 hex) ---');
expectUrl('getTransaction(valid txid)', () => api.getTransaction(TXID), `/tl_gettransaction/${TXID}`);
expectUrl('getTransaction(uppercase txid)', () => api.getTransaction(TXID.toUpperCase()), `/tl_gettransaction/${TXID.toUpperCase()}`);
expectRejected('getTransaction(63 hex)', () => api.getTransaction('a'.repeat(63)));
expectRejected('getTransaction(65 hex)', () => api.getTransaction('a'.repeat(65)));
expectRejected('getTransaction(64 chars incl. "../")', () => api.getTransaction('../' + 'a'.repeat(61)));
expectRejected('getTransaction(txid + "/../x")', () => api.getTransaction(TXID + '/../x'));
expectRejected('getTransaction(txid + newline)', () => api.getTransaction(TXID + '\n'));

console.log('--- numeric ids (canonical digits or safe integers) ---');
expectUrl("getContract('123') route-param string", () => api.getContract('123'), '/contracts/123');
expectUrl('getContract(123) number', () => api.getContract(123), '/contracts/123');
expectUrl("getContract('007') normalizes", () => api.getContract('007'), '/contracts/7');
expectUrl("getContract('0') zero", () => api.getContract('0'), '/contracts/0');
expectUrl("getContract('9007199254740991') max safe", () => api.getContract('9007199254740991'), '/contracts/9007199254740991');
expectUrl('getContractOpenInterest(1) number', () => api.getContractOpenInterest(1), '/contracts/1/open_interest');
expectUrl('getContractTradeHistory("5")', () => api.getContractTradeHistory('5'), '/contracts/5/trade_history');
expectUrl('getContractTradeHistoryUnfiltered("5")', () => api.getContractTradeHistoryUnfiltered('5'), '/contracts/5/trade_history_unfiltered');
expectUrl('getPropData("3")', () => api.getPropData('3'), '/tl_getproperty/3');
expectUrl('getPropCurrencyTotal("3")', () => api.getPropCurrencyTotal('3'), '/token/3/currency_total');
expectUrl('getPropCache("3")', () => api.getPropCache('3'), '/tl_propertyFeeCache/3');
expectUrl('getPropVestingInfo("3")', () => api.getPropVestingInfo('3'), '/token/3/vesting_info');
expectUrl('getPropLtcVolume(1, 2, 3)', () => api.getPropLtcVolume(1, 2, 3), '/token/1/ltc_volume?startBlock=2&endBlock=3');
expectUrl('getTransactionsForBlock("834692")', () => api.getTransactionsForBlock('834692'), '/tl_gettransactionsforblock/834692');
expectRejected("getContract('1.5')", () => api.getContract('1.5'));
expectRejected("getContract('1e3')", () => api.getContract('1e3'));
expectRejected("getContract('0x10')", () => api.getContract('0x10'));
expectRejected("getContract('')", () => api.getContract(''));
expectRejected("getContract('123abc')", () => api.getContract('123abc'));
expectRejected("getContract('-1')", () => api.getContract('-1'));
expectRejected("getContract('../2')", () => api.getContract('../2'));
expectRejected("getContract('3%2F..')", () => api.getContract('3%2F..'));
expectRejected("getContract('9007199254740993') unsafe", () => api.getContract('9007199254740993'));
expectRejected("getContract('9999999999999999') 16 digits, unsafe", () => api.getContract('9999999999999999'));
expectRejected("getContract('99999999999999999999') 20 digits", () => api.getContract('99999999999999999999'));
expectRejected('getContract(-1)', () => api.getContract(-1));
expectRejected('getContract(1.5)', () => api.getContract(1.5));
expectRejected('getContract(NaN)', () => api.getContract(NaN));
expectRejected('getContract(Infinity)', () => api.getContract(Infinity));
expectRejected('getContract(null)', () => api.getContract(null));
expectRejected('getContract(undefined)', () => api.getContract(undefined));
expectRejected('getPropLtcVolume with bad endBlock', () => api.getPropLtcVolume(1, 2, 'x'));
expectRejected('getPropLtcVolume with bad startBlock', () => api.getPropLtcVolume(1, '2&x=1', 3));

console.log('--- the request builder refuses unvalidated parts ---');
// A future call site must not be able to hand the builder a raw string.
expectRejected('get() with raw string interpolation', () =>
  api.get(['/tl_gettransaction/', ''], '../../some_other_endpoint'));
expectRejected('get() with raw string containing a query', () =>
  api.get(['/token/', '/vesting_info'], '1?x=../..'));
// Shape-compatible objects are what a forged ApiParam would look like at runtime.
expectRejected('get() with a plain object shaped like ApiParam', () =>
  api.get(['/tl_gettransaction/', ''], { encoded: '../../some_other_endpoint' }));
expectRejected('get() with an Object.create(prototype) forgery', () =>
  api.get(['/tl_gettransaction/', ''], Object.create(Object.prototype, { encoded: { value: '../../x' } })));
expectRejected('get() with a null-encoded object', () =>
  api.get(['/tl_gettransaction/', ''], { encoded: null }));

console.log('--- static endpoints are unchanged ---');
expectUrl('getTop10Blocks()', () => api.getTop10Blocks(), '/tl_gettop10blocks');
expectUrl('getNativeContracts()', () => api.getNativeContracts(), '/contracts/natives');
expectUrl('getProperties()', () => api.getProperties(), '/tl_listproperties');

console.log('--- error emission contract ---');
{
  // Validation failure: navigate once, emit nothing, complete (no `true` leaks).
  const r = run(() => api.getBalance('../x'));
  check('invalid param: emits nothing', r.emitted.length, 0);
  check('invalid param: completes', r.completed, true);
}
{
  // API failure: same contract, via get()'s catchError.
  const prev = httpResponse;
  httpResponse = () => throwError(() => ({ message: 'boom' }));
  const r = run(() => api.getTransaction(TXID));
  httpResponse = prev;
  check('API error: navigates to error page with message', r.navigated, ['error']);
  check('API error: emits nothing', r.emitted.length, 0);
  check('API error: completes', r.completed, true);
}

// ---------------------------------------------------------------------------
// External links: one href builder, http/https only, no credentials.
// ---------------------------------------------------------------------------
console.log('--- safeExternalHref ---');
let safeExternalHref = null;
if (fs.existsSync(safeLinkPath)) {
  ({ safeExternalHref } = loadTs(safeLinkPath, {}));
}
if (typeof safeExternalHref !== 'function') {
  console.log(`FAIL  safe-link module missing: ${safeLinkPath}`);
  failures++;
} else {
  const href = (v) => safeExternalHref(v);
  check('https URL', href('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  check('http URL allowed', href('http://example.com'), 'http://example.com/');
  check('bare host gets https', href('example.com'), 'https://example.com/');
  check('whitespace trimmed', href('  https://example.com  '), 'https://example.com/');
  check('uppercase scheme', href('HTTPS://EXAMPLE.COM'), 'https://example.com/');
  check('protocol-relative is refused', href('//example.com'), null);
  check('bare dotted host with port', href('example.com:8080'), 'https://example.com:8080/');
  check('single-label host refused', href('localhost'), null);
  check('backslash userinfo confusion (target is the trailing host)', href('https://evil.example\\@good.com'), null);
  check('backslash after host', href('https://good.com\\@evil.example'), null);
  check('backslash scheme slashes', href('https:\\\\evil.example'), null);
  check('empty userinfo with @ in authority', href('https://:@evil.example'), null);
  check('IDN / Cyrillic homograph refused (display would differ from target)', href('https://g\u043eogle.com'), null);
  check('punycode input allowed (display equals target)', href('https://xn--ggle-0nda.com'), 'https://xn--ggle-0nda.com/');
  check('percent-encoded host refused (text %65vil.com, target evil.com)', href('https://%65vil.com'), null);
  check('numeric IPv4 host refused (text 0x7f.1, target 127.0.0.1)', href('https://0x7f.1/'), null);
  check('decimal IPv4 host refused (text 2130706433)', href('https://2130706433/'), null);
  check('empty host refused (https:///x.com)', href('https:///evil.example'), null);
  check('explicit port still allowed', href('https://example.com:8443/x'), 'https://example.com:8443/x');
  check('embedded tab refused (URL parser would strip it)', href('https://goo\tgle.com'), null);
  check('zero-width space refused', href('https://goo\u200bgle.com'), null);
  check('NUL refused', href('https://example.com\u0000'), null);
  check('ftp:// refused (was https://ftp//example.com)', href('ftp://example.com'), null);
  check('javascript:0 refused (was https://javascript:0/)', href('javascript:0'), null);
  check('2049-char URL refused', href('https://example.com/' + 'a'.repeat(2030)), null);
  check('2048-char URL allowed', href('https://example.com/' + 'a'.repeat(2028)).length, 2048);
  check('@ in path is fine (display equals target)', href('https://x.com/@user'), 'https://x.com/@user');
  check('javascript:', href('javascript:alert(1)'), null);
  check('JaVaScRiPt: mixed case', href('JaVaScRiPt:alert(1)'), null);
  check('javascript: with tab inside', href('java\tscript:alert(1)'), null);
  check('javascript: with newline inside', href('java\nscript:alert(1)'), null);
  check('javascript:1 is refused (a bare value needs a dotted host)', href('javascript:1'), null);
  check('data: URL', href('data:text/html,<script>alert(1)</script>'), null);
  check('vbscript:', href('vbscript:msgbox(1)'), null);
  // Without a scheme the value is read as a host, so this becomes an https link
  // to host 'file'; the point is that no file: or other non-web scheme comes out.
  check('file:///etc/passwd refused', href('file:///etc/passwd'), null);
  check('httpfoo:bar (old startsWith gate accepted it)', href('httpfoo:bar'), null);
  check('credentials rejected (user:pass)', href('https://user:pass@example.com'), null);
  check('credentials rejected (display/target mismatch)', href('https://paypal.com@evil.example'), null);
  check('space in host', href('https://exa mple.com'), null);
  check('broken IPv6', href('https://[::1'), null);
  // Round 6 / F-B1: loopback, private, link-local and unspecified literals are refused.
  // Before this round each of these was accepted as an external link.
  check('loopback name with port refused (http://localhost:8000)', href('http://localhost:8000/'), null);
  check('IPv4 loopback refused', href('http://127.0.0.1/'), null);
  check('IPv6 loopback refused', href('https://[::1]/'), null);
  check('IPv6 loopback with port refused', href('https://[::1]:8080/x'), null);
  check('IPv6 unspecified refused', href('https://[::]/'), null);
  check('IPv4-mapped loopback refused', href('https://[::ffff:127.0.0.1]/'), null);
  check('IPv4 private 192.168 refused (router admin pages)', href('http://192.168.0.1/'), null);
  check('IPv4 private 10/8 refused', href('https://10.1.2.3/'), null);
  check('IPv4 private 172.16/12 refused', href('https://172.16.5.5/'), null);
  check('IPv4 link-local / metadata refused', href('http://169.254.169.254/latest/meta-data'), null);
  check('IPv6 link-local refused', href('https://[fe80::1]/'), null);
  check('IPv6 unique-local refused', href('https://[fd12:3456::1]/'), null);
  check('.localhost name refused', href('https://app.localhost/'), null);
  check('public IPv4 still allowed', href('https://8.8.8.8/'), 'https://8.8.8.8/');
  check('172.32/16 is public and allowed', href('https://172.32.0.1/'), 'https://172.32.0.1/');
  check('public IPv6 still allowed', href('https://[2001:4860:4860::8888]/'), 'https://[2001:4860:4860::8888]/');
  check('empty', href(''), null);
  check('whitespace only', href('   '), null);
  check('number', href(12), null);
  check('null', href(null), null);
  check('object', href({ url: 'https://example.com' }), null);
  check('array', href(['https://example.com']), null);
}

// ---------------------------------------------------------------------------
// Round 8: the error message travels in navigation state, never in the URL, and a
// link's value must have the shape of its target before a router path is built.
// ---------------------------------------------------------------------------

console.log('--- error message travels in navigation state, not in the URL ---');
{
  const prev = httpResponse;
  httpResponse = () => throwError(() => ({ message: 'boom' }));
  run(() => api.getTransaction(TXID));
  httpResponse = prev;
  const apiError = navigations[navigations.length - 1];
  check('API error: no query parameters on the error navigation', apiError.extras.queryParams === undefined, true);
  check('API error: message is in navigation state', apiError.extras.state?.message, 'boom');

  run(() => api.getBalance('../x'));
  const invalid = navigations[navigations.length - 1];
  check('invalid param: message is in navigation state', invalid.extras.state?.message, 'Invalid lookup parameter');
}

console.log('--- the error page shows only a message the app set in navigation state ---');
{
  const errorPagePath = path.join(repoRoot, 'src/app/@pages/error-page/error-page.component.ts');
  const realHistory = globalThis.history;
  const pageMessage = (historyState, route) => {
    globalThis.history = { state: historyState };
    try {
      const { ErrorPageComponent } = loadTs(errorPagePath, {
        '@angular/core': { Component: () => (target) => target },
      });
      const c = new ErrorPageComponent(route);
      c.ngOnInit();
      return c.message;
    } catch (e) {
      return `THREW: ${e.message}`;
    } finally {
      globalThis.history = realHistory;
    }
  };
  const GENERIC = 'An unexpected error occurred.';
  check('error page: the app-set message is shown', pageMessage({ message: 'Invalid lookup parameter' }), 'Invalid lookup parameter');
  check('error page: no navigation state -> generic message', pageMessage(null), GENERIC);
  check('error page: non-string state is ignored', pageMessage({ message: { x: 1 } }), GENERIC);
  check('error page: a URL query message is ignored',
    pageMessage(null, { snapshot: { queryParams: { message: 'Your wallet is locked, call 555-0100' } } }), GENERIC);
}

console.log('--- the production build admits exactly the inline code the CSP hashes ---');
{
  // The CSP in src/index.html is the only policy. It is checked against a fresh production build,
  // not against a copy of the build's text: every inline handler and inline script in the output must
  // have its hash in script-src, and no other hash may be there. Any eval is blocked by the browser.
  const buildOut = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-explorer-csp-'));
  try {
    execFileSync(process.execPath, [path.join(repoRoot, 'node_modules/@angular/cli/bin/ng.js'),
      'build', '--configuration', 'production', '--output-path', buildOut], {
      cwd: repoRoot,
      env: { ...process.env, NG_CLI_ANALYTICS: 'false' },
      stdio: 'pipe',
    });
    const built = fs.readFileSync(path.join(buildOut, 'index.html'), 'utf8');
    const hashOf = (text) => `'sha256-${crypto.createHash('sha256').update(text).digest('base64')}'`;
    const handlers = [...built.matchAll(/\son[a-z]+="([^"]*)"/gi)].map((m) => m[1]);
    const inlineScripts = [...built.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((m) => m[1]);
    const entityFree = handlers.every((h) => !h.includes('&'));
    check('build: handler attributes contain no HTML entities (hash input is the raw text)', entityFree, true);
    check('build: no inline <script> block (each would need its own hash)', inlineScripts.length, 0);

    const html = fs.readFileSync(path.join(repoRoot, 'src/index.html'), 'utf8');
    const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i.exec(html);
    const directives = new Map();
    if (csp) {
      for (const part of csp[1].split(';')) {
        const [name, ...values] = part.trim().split(/\s+/);
        if (name) directives.set(name.toLowerCase(), values.join(' '));
      }
    }
    check('CSP is present in index.html', Boolean(csp), true);
    const expectedScriptSrc = ["'self'", ...handlers.map(hashOf), ...(handlers.length ? ["'unsafe-hashes'"] : [])].join(' ');
    check('script-src is exactly self plus the build handler hashes', directives.get('script-src'), expectedScriptSrc);
    check("object-src is 'none'", directives.get('object-src'), "'none'");
    check("base-uri is 'self'", directives.get('base-uri'), "'self'");

    const prodEnv = fs.readFileSync(path.join(repoRoot, 'src/environments/environment.prod.ts'), 'utf8');
    const apiOrigin = new URL(/apiUrl:\s*'([^']+)'/.exec(prodEnv)[1]).origin;
    check('connect-src admits the production API origin', (directives.get('connect-src') || '').split(' ').includes(apiOrigin), true);
  } finally {
    fs.rmSync(buildOut, { recursive: true, force: true });
  }
}

console.log('--- a link value must have the shape of its target ---');
{
  const pt = loadTs(propertyTypesPath, { 'src/app/@core/lookup-value': lookupModule });
  check('address link for a valid address', pt.getLinkFromPropertyType('address', ADDR), ['/', 'addresses', ADDR]);
  check('address value with a path escape is not linked', pt.getLinkFromPropertyType('address', `../tx/${TXID}`), []);
  check('transaction link for a txid', pt.getLinkFromPropertyType('transaction', TXID), ['/', 'tx', TXID]);
  check('transaction value with a slash is not linked', pt.getLinkFromPropertyType('transaction', `${'a'.repeat(63)}/`), []);
  check('block id given as a number is linked as its digits', pt.getLinkFromPropertyType('blocks', 834692), ['/', 'blocks', '834692']);
  check('block id with a dot-dot segment is not linked', pt.getLinkFromPropertyType('blocks', '../1'), []);
  check('property id is linked', pt.getLinkFromPropertyType('property', '31'), ['/', 'properties', '31']);
  check('a url value never becomes a router link', pt.getLinkFromPropertyType('url', 'https://example.com'), []);
  check('an unknown property type yields no link', pt.getLinkFromPropertyType('bogus', ADDR), []);
  check('a key that names an inherited member is not linkable', pt.isLinkable('constructor'), false);
}

// ---------------------------------------------------------------------------
// Characterization of the in-app link and table layer, and structural guards: one
// element writes external hrefs, one module calls HttpClient.
// ---------------------------------------------------------------------------

const sharedStubs = {
  '@angular/core': {
    Component: () => (target) => target,
    Input: () => () => {},
    Pipe: () => (target) => target,
  },
  '../property-types': loadTs(propertyTypesPath, { 'src/app/@core/lookup-value': lookupModule }),
  'src/app/@core/safe-link': loadTs(safeLinkPath, {}),
  'src/app/@utils/pipes': loadTs(path.join(repoRoot, 'src/app/@utils/pipes.ts'), {
    '@angular/core': { Pipe: () => (target) => target },
  }),
};

// Every source template and class under src/, as repo-relative paths and text.
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const sourceFiles = walk(path.join(repoRoot, 'src')).filter((f) => /\.(ts|html)$/.test(f))
  .map((f) => ({ rel: path.relative(repoRoot, f), text: fs.readFileSync(f, 'utf8') }));
const filesMatching = (re) => sourceFiles.filter((f) => re.test(f.text)).map((f) => f.rel).sort();


console.log('--- search box: a query routes to a transaction, block or address page ---');
{
  const appPath = path.join(repoRoot, 'src/app/app.component.ts');
  const { AppComponent } = loadTs(appPath, {
    '@angular/core': { Component: () => (target) => target },
    '@angular/router': { Router: class {} },
  });
  const navs = [];
  const app = new AppComponent({ navigate: (commands) => { navs.push(commands); return Promise.resolve(true); } });
  app.search(TXID);
  app.search('  834692 ');
  app.search(ADDR);
  app.search('   ');
  app.search(undefined);
  check('search: 64-character query -> tx route', navs[0], ['tx', TXID]);
  check('search: all digits -> blocks route, trimmed', navs[1], ['blocks', '834692']);
  check('search: anything else -> addresses route', navs[2], ['addresses', ADDR]);
  check('search: blank query -> no navigation', navs.length, 3);
}

console.log('--- a router link and the API request for the same value agree ---');
{
  // Both layers read a value through lookup-value.ts. A link is either absent, when the request is
  // refused, or it names the same id, address or txid the request carries.
  const pt = loadTs(propertyTypesPath, { 'src/app/@core/lookup-value': lookupModule });
  const linkCarries = (type, v) => {
    const link = pt.getLinkFromPropertyType(type, v);
    return link.length ? link[link.length - 1] : null;
  };
  const requestCarries = (fn) => {
    const r = run(fn);
    return r.requested.length ? r.requested[0].split('/').pop() : null;
  };
  const cases = [
    ['blocks', (v) => api.getTransactionsForBlock(v), ['834692', '007', '0', 12, '1.5', '9999999999999999', '9007199254740991', '9007199254740993', '../1']],
    ['contract', (v) => api.getContract(v), ['5', '007', '-1', '99999999999999999999', '3%2F..']],
    ['property', (v) => api.getPropData(v), ['31', '031', '1e3']],
    ['address', (v) => api.getBalance(v), [ADDR, '../x', 'a'.repeat(120), 'a'.repeat(121), `${ADDR}?x=1`]],
    ['transaction', (v) => api.getTransaction(v), [TXID, TXID.toUpperCase(), '../' + 'a'.repeat(61), 'a'.repeat(63)]],
  ];
  for (const [type, call, values] of cases) {
    for (const v of values) {
      const want = requestCarries(() => call(v));
      check(`${type} ${JSON.stringify(String(v).slice(0, 24))} (${String(v).length} chars): link and request agree`, linkCarries(type, v) === want, true);
    }
  }
  check('lookup: "007" is the canonical id 7', lookupModule.canonicalLookup('id', '007'), '7');
  check('lookup: an id above 2^53 - 1 has no canonical form', lookupModule.canonicalLookup('id', '9999999999999999'), null);
}

console.log('--- link components: values and stale state ---');
{
  const { ListTableComponent } = loadTs(path.join(repoRoot, 'src/app/@components/list-table/list-table.component.ts'), sharedStubs);
  const list = new ListTableComponent();
  list.linkType = 'address';
  check('list-table: valid address value links', list.link(ADDR), ['/', 'addresses', ADDR]);
  check('list-table: non-address value does not link', list.link('../x'), []);
  check('list-table: empty value does not link', list.link(''), []);

  const { CollectionTableComponent } = loadTs(path.join(repoRoot, 'src/app/@components/collection-table/collection-table.component.ts'), sharedStubs);
  const coll = new CollectionTableComponent();
  coll.linkType = 'transaction';
  check('collection-table: txid row links', coll.link(TXID), ['/', 'tx', TXID]);
  check('collection-table: non-txid row does not link', coll.link('834692'), []);

  const { PossibleLinkComponent } = loadTs(path.join(repoRoot, 'src/app/@components/possible-link/possible-link.component.ts'), sharedStubs);
  const pl = new PossibleLinkComponent();
  pl.key = 'url';
  pl.value = 'https://example.com';
  pl.ngOnChanges({ key: {}, value: {} });
  check('possible-link: url value gets an href', pl.externalHref, 'https://example.com/');
  pl.value = 'javascript:alert(1)';
  pl.ngOnChanges({ value: {} });
  check('possible-link: unsafe next value clears the previous href', pl.externalHref, null);
  pl.key = 'issuer';
  pl.value = ADDR;
  pl.ngOnChanges({ key: {}, value: {} });
  check('possible-link: issuer key links internally, no href', [pl.link, pl.externalHref], [['/', 'addresses', ADDR], null]);
  pl.key = 'propertyid';
  pl.value = 0;
  pl.ngOnChanges({ key: {}, value: {} });
  check('possible-link: numeric zero links to its property', pl.link, ['/', 'properties', '0']);
  pl.value = '';
  pl.ngOnChanges({ value: {} });
  check('possible-link: empty value has no link', pl.link, []);
}

console.log('--- one element writes external hrefs; one module calls HttpClient ---');
{
  check('href or target=_blank is written only in possible-link',
    filesMatching(/\[href\]|\shref=|target="_blank"/).filter((rel) => !rel.endsWith('src/index.html')),
    ['src/app/@components/possible-link/possible-link.component.html']);
  check('HttpClient.get is called only from tl-api.service.ts',
    filesMatching(/\bhttp\.get\(/), ['src/app/@core/api/tl-api.service.ts']);
}

console.log('--- an empty value is a dash; zero and false are shown ---');
{
  const pipes = loadTs(path.join(repoRoot, 'src/app/@utils/pipes.ts'), {
    '@angular/core': { Pipe: () => (target) => target },
  });
  check('isBlank: zero is a value', pipes.isBlank?.(0), false);
  check('isBlank: false is a value', pipes.isBlank?.(false), false);
  check("isBlank: '0' is a value", pipes.isBlank?.('0'), false);
  check("isBlank: '' is blank", pipes.isBlank?.(''), true);
  check('isBlank: null and undefined are blank', [pipes.isBlank?.(null), pipes.isBlank?.(undefined)], [true, true]);
  const dash = (v) => (pipes.DashPipe ? new pipes.DashPipe().transform(v) : 'missing');
  check('dash: zero is shown, not a dash', dash(0), 0);
  check("dash: '' is a dash", dash(''), '-');
  check('dash: null is a dash', dash(null), '-');
  check('dash: text is shown', dash('abc'), 'abc');
  check("templates: no `|| '-'` placeholder is left", filesMatching(/\|\|\s*["']-["']/), []);
  check('templates: every table cell placeholder uses the dash pipe',
    filesMatching(/\|\s*dash\b/),
    ['src/app/@components/collection-table/collection-table.component.html',
      'src/app/@components/list-table/list-table.component.html',
      'src/app/@components/object-table/object-table.component.html']);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
