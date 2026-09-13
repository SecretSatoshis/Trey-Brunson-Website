import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import vm from 'node:vm';
import ts from 'typescript';
function load(file, globals) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const context = vm.createContext({ exports: {}, Response, Headers, AbortController, setTimeout, clearTimeout, ...globals });
  vm.runInContext(code, context);
  return context.exports;
}
test('API preserves old timestamps for truthful freshness and rejects invalid timestamps', async () => {
  for (const time of [1577836800, undefined, 'bad', Math.floor(Date.now()/1000) + 3600]) {
    const route = load('app/api/bitcoin/route.ts', { fetch: async url => url.endsWith('height') ? new Response('966502') : Response.json({ USD: 77022, time }) });
    const response = await route.GET();
    assert.equal(response.status, time === 1577836800 ? 200 : 503);
    if (response.ok) assert.equal((await response.json()).priceUpdatedAt, time);
  }
});
test('CSP relaxes debugging only in development', () => {
  for (const env of ['production', 'development']) {
    const proxy = load('proxy.ts', { process: { env: { NODE_ENV: env } }, Buffer, crypto: webcrypto, require: () => ({ NextResponse: { next: () => ({ headers: new Headers() }) } }) }).default;
    const csp = proxy({ headers: new Headers() }).headers.get('Content-Security-Policy');
    assert.equal(csp.includes("'unsafe-eval'"), env === 'development');
    assert.equal(csp.includes('upgrade-insecure-requests'), env === 'production');
  }
});
test('polls wait for completion, abort at deadline and stop on unmount', async () => {
  let effect, resolveRequest, cleanup;
  const timers = new Map(); let id = 0, calls = 0, signal;
  const setTimer = (fn, ms) => { timers.set(++id, { fn, ms }); return id; };
  const clearTimer = id => timers.delete(id);
  const component = load('app/SupplyHeroModule.tsx', {
    require: name => name === 'react' ? { useEffect: fn => { effect = fn; }, useState: value => [value, () => {}], useMemo: fn => fn() } : { jsx() {}, jsxs() {} },
    setTimeout: setTimer, clearTimeout: clearTimer,
    window: { setTimeout: setTimer, clearTimeout: clearTimer, setInterval: setTimer, clearInterval: clearTimer },
    fetch: (_, options) => { calls++; signal = options.signal; return new Promise(resolve => { resolveRequest = resolve; }); },
  }).default;
  component(); cleanup = effect();
  assert.equal(calls, 1);
  assert.equal([...timers.values()].some(t => t.ms === 60000), false);
  [...timers.values()].find(t => t.ms === 10000).fn();
  assert.equal(signal.aborted, true);
  resolveRequest(Response.json({ blockHeight: 966502, priceUsd: 77022, priceUpdatedAt: 1577836800, fetchedAt: Math.floor(Date.now()/1000) }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal([...timers.values()].some(t => t.ms === 60000), true);
  cleanup();
  assert.equal(timers.size, 0);
});
test('live labels expire with source age, fetch age or a failed refresh', () => {
  const now = 1789129000;
  for (const [priceAge, fetchAge, failed, live] of [[60, 30, false, true], [901, 30, false, false], [60, 301, false, false], [60, 30, true, false]]) {
    const states = [966502, 77022, now - priceAge, now - fetchAge, now, true, failed];
    const component = load('app/SupplyHeroModule.tsx', {
      require: name => name === 'react' ? {
        useEffect() {}, useState: () => [states.shift(), () => {}], useMemo: fn => fn(),
      } : { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    }).default;
    const tree = JSON.stringify(component());
    assert.equal(tree.includes('Live market'), live);
    assert.equal(tree.includes('Live price'), !failed && priceAge <= 900);
    assert.equal(tree.includes('Live network'), !failed && fetchAge <= 300);
    assert.equal(tree.includes('As of'), true);
    assert.equal(tree.includes(new Date((now - priceAge) * 1000).toISOString()), true);
  }
});
