import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as bitcoinLib from '../lib/bitcoin.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Transpiles a source file and runs it in a sandbox with the given globals, returning its exports.
function load(file, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const userRequire = globals.require;
  const requireShim = (specifier) => {
    if (specifier === '@/lib/bitcoin') return bitcoinLib;
    if (userRequire) return userRequire(specifier);
    throw new Error(`Unexpected require in test sandbox: ${specifier}`);
  };
  const context = vm.createContext({
    exports: {},
    Response,
    Headers,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    console: { ...console, error() {}, warn() {} },
    ...globals,
    require: requireShim,
  });
  vm.runInContext(code, context);
  return context.exports;
}

test('issuedSupplyAtHeight matches exact protocol subsidy at halving boundaries', () => {
  assert.equal(bitcoinLib.issuedSupplyAtHeight(0), 50);
  assert.equal(bitcoinLib.issuedSupplyAtHeight(209_999), 10_500_000);
  assert.equal(bitcoinLib.issuedSupplyAtHeight(210_000), 10_500_025);
  assert.equal(bitcoinLib.issuedSupplyAtHeight(840_000), 19_687_503.125);
  assert.equal(bitcoinLib.issuedSupplyAtHeight(6_930_000), 20_999_999.9769);
  assert.equal(bitcoinLib.issuedSupplyAtHeight(-1), 0);
});

test('formatters floor fractional BTC, format sub-$1T market cap in Billions, and show dates when >24h stale', () => {
  assert.equal(bitcoinLib.formatWholeBtc(19_987_654.875), '19,987,654');
  assert.equal(bitcoinLib.formatMarketCap(850_000_000_000), '$850.00 Billion');
  assert.equal(bitcoinLib.formatMarketCap(1_950_000_000_000), '$1.95 Trillion');
  assert.equal(bitcoinLib.formatMarketCap(null), '—');

  const refNow = 1_790_000_000;
  const recentText = bitcoinLib.formatAsOfTimestamp(refNow - 300, refNow);
  const staleText = bitcoinLib.formatAsOfTimestamp(refNow - 36 * 3600, refNow);
  assert.ok(staleText.length > recentText.length);
  assert.match(staleText, /[A-Za-z]{3}/);
});

test('API rejects unexpected query strings with 400 to block cache-busting', async () => {
  let fetchCalled = false;
  const route = load('app/api/bitcoin/route.ts', {
    fetch: async () => {
      fetchCalled = true;
      return new Response('966502');
    },
  });
  const response = await route.GET(new Request('https://treybrunson.com/api/bitcoin?r=12345'));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(fetchCalled, false);
});

test('API uses BRK primary including UTXO supply and sends proper Accept/User-Agent headers', async () => {
  const seenRequests = [];
  const nowSec = Math.floor(Date.now() / 1000);
  const route = load('app/api/bitcoin/route.ts', {
    fetch: async (url, init) => {
      seenRequests.push({ url, headers: init.headers });
      if (url === 'https://bitview.space/api/blocks/tip/height') {
        return new Response('966502', { headers: { 'Content-Type': 'text/plain' } });
      }
      if (url === 'https://bitview.space/api/v1/prices') {
        return Response.json({ USD: 95_000, time: nowSec - 30 });
      }
      if (url === 'https://bitview.space/api/series/circulating_supply/height/latest') {
        return Response.json({ data: [19_850_123.45] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const response = await route.GET(new Request('https://treybrunson.com/api/bitcoin'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.blockHeight, 966_502);
  assert.equal(body.circulatingSupply, 19_850_123.45);
  assert.equal(body.supplySource, 'utxo');
  assert.equal(body.priceUsd, 95_000);
  assert.equal(body.priceUpdatedAt, nowSec - 30);

  const heightReq = seenRequests.find((r) => r.url.endsWith('/blocks/tip/height'));
  assert.equal(heightReq.headers.Accept, 'text/plain');
  assert.match(heightReq.headers['User-Agent'], /treybrunson\.com/);
});

test('API fails over to mempool.space and scheduled supply when BRK fails', async () => {
  const nowSec = Math.floor(Date.now() / 1000);
  const route = load('app/api/bitcoin/route.ts', {
    fetch: async (url) => {
      if (url.startsWith('https://bitview.space/')) {
        return new Response('rate limited', { status: 503 });
      }
      if (url === 'https://mempool.space/api/blocks/tip/height') {
        return new Response('966502');
      }
      if (url === 'https://mempool.space/api/v1/prices') {
        return Response.json({ USD: 91_250, time: nowSec - 45 });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const response = await route.GET(new Request('https://treybrunson.com/api/bitcoin'));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.blockHeight, 966_502);
  assert.equal(body.circulatingSupply, bitcoinLib.issuedSupplyAtHeight(966_502));
  assert.equal(body.supplySource, 'scheduled');
  assert.equal(body.priceUsd, 91_250);
});

test('API enforces strict numeric parsing, mainnet bounds, and decouples price vs height failures', async () => {
  const nowSec = Math.floor(Date.now() / 1000);

  // Valid historical timestamp above mainnet floor (>1_700_000_000) is preserved.
  const validOld = load('app/api/bitcoin/route.ts', {
    fetch: async (url) => {
      if (url.endsWith('/blocks/tip/height')) return new Response('966502');
      if (url.endsWith('/v1/prices')) return Response.json({ USD: 77_022, time: 1_710_000_000 });
      return new Response('not found', { status: 404 });
    },
  });
  const okRes = await validOld.GET();
  assert.equal(okRes.status, 200);
  assert.equal((await okRes.json()).priceUpdatedAt, 1_710_000_000);

  // Invalid price timestamp decouples from height: height still succeeds as partial non-cached response.
  for (const badPrice of [
    { USD: 77_022, time: 1_577_836_800 }, // below 1_700_000_000 bound
    { USD: 77_022, time: undefined },
    { USD: 77_022, time: 'bad' },
    { USD: 77_022, time: nowSec + 3600 }, // future
    { USD: 500, time: nowSec - 10 }, // below $1,000 bound
  ]) {
    const partialRoute = load('app/api/bitcoin/route.ts', {
      fetch: async (url) => {
        if (url.endsWith('/blocks/tip/height')) return new Response('966502');
        if (url.endsWith('/v1/prices')) return Response.json(badPrice);
        return new Response('not found', { status: 404 });
      },
    });
    const res = await partialRoute.GET();
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    const json = await res.json();
    assert.equal(json.blockHeight, 966_502);
    assert.equal(json.priceUsd, null);
  }

  // Hex or out-of-bounds height plus bad price returns 503.
  for (const badHeight of ['0x10', '100', '999999999']) {
    const failingRoute = load('app/api/bitcoin/route.ts', {
      fetch: async (url) => {
        if (url.endsWith('/blocks/tip/height')) return new Response(badHeight);
        if (url.endsWith('/v1/prices')) return Response.json({ USD: 0, time: 0 });
        return new Response('not found', { status: 404 });
      },
    });
    const res = await failingRoute.GET();
    assert.equal(res.status, 503);
  }
});

test('API coalesces concurrent requests and serves within 15s in-memory TTL', async () => {
  let calls = 0;
  const nowSec = Math.floor(Date.now() / 1000);
  const route = load('app/api/bitcoin/route.ts', {
    fetch: async (url) => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      if (url.endsWith('/blocks/tip/height')) return new Response('966502');
      if (url.endsWith('/v1/prices')) return Response.json({ USD: 90_000, time: nowSec - 15 });
      if (url.endsWith('/latest')) return Response.json(19_850_000);
      return new Response('', { status: 404 });
    },
  });

  const [r1, r2, r3] = await Promise.all([route.GET(), route.GET(), route.GET()]);
  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3.status, 200);
  assert.equal(calls, 3); // exactly 1 BRK height + 1 BRK price + 1 BRK supply

  // Subsequent immediate call hits 15s memory TTL without re-fetching.
  const r4 = await route.GET();
  assert.equal(r4.status, 200);
  assert.equal(calls, 3);
});

test('CSP enforces strict directives, 16-byte nonce, and does not bypass Purpose: prefetch', () => {
  for (const env of ['production', 'development']) {
    const mod = load('proxy.ts', {
      process: { env: { NODE_ENV: env } },
      Buffer,
      crypto: webcrypto,
      require: () => ({ NextResponse: { next: () => ({ headers: new Headers() }) } }),
    });
    const csp = mod.default({ headers: new Headers() }).headers.get('Content-Security-Policy');
    assert.equal(csp.includes("'unsafe-eval'"), env === 'development');
    assert.equal(csp.includes('upgrade-insecure-requests'), env === 'production');
    assert.equal(csp.includes("frame-src 'none'"), true);
    assert.equal(csp.includes('blob:'), false);

    const match = csp.match(/'nonce-([^']+)'/);
    assert.ok(match);
    assert.equal(Buffer.from(match[1], 'base64').length, 16);

    const matcherEntry = mod.config.matcher[0];
    assert.equal(
      matcherEntry.missing.some((m) => m.key === 'purpose'),
      false,
    );
    const sourceRegex = new RegExp(`^${matcherEntry.source}$`);
    assert.equal(sourceRegex.test('/'), true);
    assert.equal(sourceRegex.test('/api/bitcoin'), false);
    assert.equal(sourceRegex.test('/robots.txt'), false);
    assert.equal(sourceRegex.test('/sitemap.xml'), false);
    assert.equal(sourceRegex.test('/llms.txt'), false);
  }
});

test('RFC 9111 Date + Age clockOffset keeps CDN cache age visible in staleness tracking', () => {
  const receivedAt = 1_790_000_000;
  // Origin generated response 50s ago, CDN cached it for 50s (`Age: 50`), browser clock is exact.
  const originDate = new Date((receivedAt - 50) * 1000).toUTCString();
  const headers = new Headers({ Date: originDate, Age: '50' });
  const offset = bitcoinLib.computeClockOffset(headers, receivedAt - 50, receivedAt);
  assert.ok(Math.abs(offset) < 1);
  // serverNow - fetchedAt preserves the full 50s CDN cache age instead of collapsing to 0.
  const serverNow = receivedAt + offset;
  assert.ok(Math.abs(serverNow - (receivedAt - 50) - 50) < 1);

  // Visitor clock 10 minutes behind server still yields ~+600s offset.
  const slowVisitorOffset = bitcoinLib.computeClockOffset(headers, receivedAt - 50, receivedAt - 600);
  assert.ok(Math.abs(slowVisitorOffset - 600) < 1);
});

test('polls wait for completion, abort at deadline, pause in background tabs, and stop on unmount', async () => {
  let effect, resolveRequest;
  const timers = new Map();
  let id = 0;
  let calls = 0;
  let signal;
  const listeners = new Map();
  const doc = {
    visibilityState: 'visible',
    addEventListener: (event, fn) => listeners.set(event, fn),
    removeEventListener: (event) => listeners.delete(event),
  };
  const setTimer = (fn, ms) => {
    timers.set(++id, { fn, ms });
    return id;
  };
  const clearTimer = (timerId) => timers.delete(timerId);

  let currentState;
  const mod = load('app/SupplyHeroModule.tsx', {
    document: doc,
    require: (name) =>
      name === 'react'
        ? {
            useEffect: (fn) => {
              effect = fn;
            },
            useState: (value) => {
              currentState = value;
              return [
                currentState,
                (updater) => {
                  currentState = typeof updater === 'function' ? updater(currentState) : updater;
                },
              ];
            },
          }
        : { jsx() {}, jsxs() {} },
    setTimeout: setTimer,
    clearTimeout: clearTimer,
    window: {
      setTimeout: setTimer,
      clearTimeout: clearTimer,
      setInterval: setTimer,
      clearInterval: clearTimer,
    },
    fetch: (_, options) => {
      calls += 1;
      signal = options.signal;
      return new Promise((resolve) => {
        resolveRequest = resolve;
      });
    },
  });

  mod.default();
  const cleanup = effect();
  assert.equal(calls, 1);
  assert.equal([...timers.values()].some((t) => t.ms === 60_000), false);

  [...timers.values()].find((t) => t.ms === 10_000).fn();
  assert.equal(signal.aborted, true);

  const nowSec = Math.floor(Date.now() / 1000);
  resolveRequest(
    Response.json({
      blockHeight: 966_502,
      circulatingSupply: 19_850_000,
      supplySource: 'utxo',
      priceUsd: 77_022,
      priceUpdatedAt: nowSec - 30,
      fetchedAt: nowSec,
    }),
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal([...timers.values()].some((t) => t.ms === 60_000), true);

  // Hiding the tab clears both polling and clock timers.
  doc.visibilityState = 'hidden';
  listeners.get('visibilitychange')();
  assert.equal(timers.size, 0);

  cleanup();
  assert.equal(listeners.size, 0);
});

test('live labels expire on server clock and tolerate a single transient blip', () => {
  const mod = load('app/SupplyHeroModule.tsx', {
    require: () => ({ useEffect() {}, useState: (v) => [v, () => {}], jsx() {}, jsxs() {} }),
  });

  const now = 1_789_129_000;
  for (const [priceAge, fetchAge, failures, expectedMarketLive, skew] of [
    [60, 30, 0, true, 0],
    [60, 30, 1, true, 0], // single transient blip preserves last good live state
    [60, 30, 2, false, 0], // two consecutive failures drop live state
    [901, 30, 0, false, 0],
    [60, 301, 0, false, 0],
    [60, 30, 0, true, 600],
    [60, 30, 0, true, -600],
    [901, 30, 0, false, 600],
  ]) {
    const view = mod.computeMarketView({
      ...mod.INITIAL_MARKET_STATE,
      blockHeight: 966_502,
      circulatingSupply: 19_850_000,
      priceUsd: 77_022,
      priceUpdatedAt: now - priceAge,
      fetchedAt: now - fetchAge,
      clockOffset: skew,
      now: now - skew,
      hasAttemptedUpdate: true,
      consecutivePriceFailures: failures,
      consecutiveSupplyFailures: failures,
    });
    assert.equal(view.isMarketLive, expectedMarketLive);
    assert.equal(view.isPriceLive, failures < 2 && priceAge <= 900);
    assert.equal(view.isSupplyLive, failures < 2 && fetchAge <= 300);
  }
});

test('applyMarketPayload handles slow visitor clock and single transient failure cleanly', () => {
  const mod = load('app/SupplyHeroModule.tsx', {
    require: () => ({ useEffect() {}, useState: (v) => [v, () => {}], jsx() {}, jsxs() {} }),
  });

  const serverNow = Math.floor(Date.now() / 1000) + 600;
  const receivedAt = serverNow - 600;
  const headers = new Headers({
    Date: new Date(serverNow * 1000).toUTCString(),
    Age: '0',
  });

  const next = mod.applyMarketPayload(
    mod.INITIAL_MARKET_STATE,
    {
      blockHeight: 966_502,
      circulatingSupply: 19_850_100.5,
      supplySource: 'utxo',
      priceUsd: 92_000,
      priceUpdatedAt: serverNow - 60,
      fetchedAt: serverNow,
    },
    headers,
    receivedAt,
  );

  assert.equal(next.consecutivePriceFailures, 0);
  assert.equal(next.consecutiveSupplyFailures, 0);
  assert.ok(Math.abs(next.clockOffset - 600) < 5);

  // One transient blip keeps live badges up.
  const afterOneBlip = mod.applyMarketFailure(next, receivedAt + 60);
  assert.equal(mod.computeMarketView(afterOneBlip).isMarketLive, true);

  // Second consecutive failure drops live badges to Last known.
  const afterTwoBlips = mod.applyMarketFailure(afterOneBlip, receivedAt + 120);
  const viewAfterTwo = mod.computeMarketView(afterTwoBlips);
  assert.equal(viewAfterTwo.isMarketLive, false);
  assert.equal(viewAfterTwo.priceStatus, 'Last known');
  assert.equal(viewAfterTwo.supplyStatus, 'Last known');
});
