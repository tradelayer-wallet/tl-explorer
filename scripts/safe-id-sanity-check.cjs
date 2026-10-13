#!/usr/bin/env node
// Unit-style sanity check for TradeLayerApi.safeId() (and the invalidParam()
// emission contract) from the adversarial security review.
//
// Runs with plain node against the real implementation: the service file is
// transpiled with the repo's own typescript package and evaluated with the
// Angular imports stubbed out, so the assertions exercise the actual
// safeId()/invalidParam() code rather than a re-implementation.
//
// Usage: node scripts/safe-id-sanity-check.cjs

'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const repoRoot = path.resolve(__dirname, '..');
const servicePath = path.join(repoRoot, 'src/app/@core/api/tl-api.service.ts');

const source = fs.readFileSync(servicePath, 'utf8');
const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    experimentalDecorators: true,
  },
  fileName: servicePath,
}).outputText;

const stubs = {
  '@angular/core': { Injectable: () => (target) => target },
  '@angular/common/http': { HttpClient: class {} },
  '@angular/router': { Router: class {} },
  'src/environments/environment': { environment: { apiUrl: 'http://localhost:3000' } },
};

const mod = new Module(servicePath, null);
mod.filename = servicePath;
mod.paths = Module._nodeModulePaths(path.join(repoRoot, 'node_modules'));
const realRequire = mod.require.bind(mod);
mod.require = (id) =>
  Object.prototype.hasOwnProperty.call(stubs, id) ? stubs[id] : realRequire(id);
mod._compile(js, servicePath);

const { TradeLayerApi } = mod.exports;
if (typeof TradeLayerApi !== 'function') {
  console.error('FAIL: TradeLayerApi could not be loaded from', servicePath);
  process.exit(1);
}

const navigations = [];
const fakeRouter = {
  navigate: (commands, extras) => {
    navigations.push({ commands, extras });
    return Promise.resolve(true);
  },
};
const svc = new TradeLayerApi(null, fakeRouter);

let failures = 0;
const check = (label, actual, expected) => {
  const ok = Object.is(actual, expected);
  if (!ok) failures++;
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}  ->  ${JSON.stringify(actual)}` +
      (ok ? '' : `  (expected ${JSON.stringify(expected)})`),
  );
};

console.log('--- safeId ---');
// Proven regression: route params are strings and must be accepted.
check("safeId('123')", svc.safeId('123'), '123');
check('safeId(123)', svc.safeId(123), '123');
check("safeId('1.5')", svc.safeId('1.5'), null);
check("safeId('9007199254740993')", svc.safeId('9007199254740993'), null);
check('safeId(NaN)', svc.safeId(NaN), null);
// Additional edge cases.
check("safeId('007') normalizes", svc.safeId('007'), '7');
check("safeId('0')", svc.safeId('0'), '0');
check('safeId(0)', svc.safeId(0), '0');
check("safeId('9007199254740991')", svc.safeId('9007199254740991'), '9007199254740991');
check('safeId(-1)', svc.safeId(-1), null);
check('safeId(1.5)', svc.safeId(1.5), null);
check('safeId(Infinity)', svc.safeId(Infinity), null);
check("safeId('')", svc.safeId(''), null);
check("safeId('1e3')", svc.safeId('1e3'), null);
check("safeId('0x10')", svc.safeId('0x10'), null);
check("safeId('123abc')", svc.safeId('123abc'), null);
check("safeId('../2')", svc.safeId('../2'), null);
check("safeId('99999999999999999999')", svc.safeId('99999999999999999999'), null);
check('safeId(null)', svc.safeId(null), null);

// invalidParam() must navigate once and emit nothing (not the navigation
// result `true`) so chained data pipelines never receive `true`.
console.log('--- invalidParam emission contract ---');
const emissions = [];
let completed = false;
svc.invalidParam().subscribe({
  next: (v) => emissions.push(v),
  complete: () => { completed = true; },
});

setTimeout(() => {
  check('invalidParam() emits nothing', emissions.length === 0 ? 'no emissions' : emissions, 'no emissions');
  check('invalidParam() completes', completed, true);
  check('invalidParam() navigates to error page once', navigations.length, 1);
  if (navigations.length) {
    check(
      'invalidParam() target route',
      navigations[0].commands.join('/'),
      'error',
    );
  }
  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}, 20);
