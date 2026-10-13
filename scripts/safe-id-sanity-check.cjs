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
const path = require('path');
const Module = require('module');
const ts = require('typescript');
const { of, throwError } = require(path.join(__dirname, '..', 'node_modules', 'rxjs'));

const repoRoot = path.resolve(__dirname, '..');
const servicePath = process.env.TL_API_SERVICE_FILE
  ? path.resolve(process.env.TL_API_SERVICE_FILE)
  : path.join(repoRoot, 'src/app/@core/api/tl-api.service.ts');
const safeLinkPath = path.join(repoRoot, 'src/app/@core/safe-link.ts');

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

const { TradeLayerApi } = loadTs(servicePath, {
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
  check('protocol-relative becomes https', href('//example.com'), 'https://example.com/');
  check('javascript:', href('javascript:alert(1)'), null);
  check('JaVaScRiPt: mixed case', href('JaVaScRiPt:alert(1)'), null);
  check('javascript: with tab inside', href('java\tscript:alert(1)'), null);
  check('javascript: with newline inside', href('java\nscript:alert(1)'), null);
  check('javascript:1 becomes an https host, never a javascript URL', href('javascript:1'), 'https://javascript:1/');
  check('data: URL', href('data:text/html,<script>alert(1)</script>'), null);
  check('vbscript:', href('vbscript:msgbox(1)'), null);
  // Without a scheme the value is read as a host, so this becomes an https link
  // to host 'file'; the point is that no file: or other non-web scheme comes out.
  check('file:/// never yields a non-https link', (href('file:///etc/passwd') || 'https://').startsWith('https://'), true);
  check('httpfoo:bar (old startsWith gate accepted it)', href('httpfoo:bar'), null);
  check('credentials rejected (user:pass)', href('https://user:pass@example.com'), null);
  check('credentials rejected (display/target mismatch)', href('https://paypal.com@evil.example'), null);
  check('space in host', href('https://exa mple.com'), null);
  check('broken IPv6', href('https://[::1'), null);
  check('empty', href(''), null);
  check('whitespace only', href('   '), null);
  check('number', href(12), null);
  check('null', href(null), null);
  check('object', href({ url: 'https://example.com' }), null);
  check('array', href(['https://example.com']), null);
}

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
