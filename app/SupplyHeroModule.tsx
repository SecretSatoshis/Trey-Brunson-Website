'use client';

import { useEffect, useState } from 'react';
import {
  computeClockOffset,
  formatAsOfTimestamp,
  formatMarketCap,
  formatUsd,
  formatWholeBtc,
  issuedSupplyAtHeight,
  isValidBlockHeight,
  isValidCirculatingSupply,
  isValidPriceUpdatedAt,
  isValidPriceUsd,
  PRICE_STALE_SECONDS,
  SUPPLY_STALE_SECONDS,
} from '@/lib/bitcoin';

const POLL_INTERVAL_MS = 60_000;
const CLOCK_TICK_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;
// Preserve last good "Live" state across a single transient blip while timestamps
// remain inside their freshness window; drop early only after 2 consecutive failures.
const FAILURE_THRESHOLD = 2;

export type MarketState = {
  blockHeight: number | null;
  circulatingSupply: number | null;
  priceUsd: number | null;
  priceUpdatedAt: number | null;
  fetchedAt: number | null;
  // Server clock minus this browser's clock, derived from HTTP Date + Age headers.
  clockOffset: number;
  now: number;
  hasAttemptedUpdate: boolean;
  consecutivePriceFailures: number;
  consecutiveSupplyFailures: number;
};

export const INITIAL_MARKET_STATE: MarketState = {
  blockHeight: null,
  circulatingSupply: null,
  priceUsd: null,
  priceUpdatedAt: null,
  fetchedAt: null,
  clockOffset: 0,
  now: 0,
  hasAttemptedUpdate: false,
  consecutivePriceFailures: 0,
  consecutiveSupplyFailures: 0,
};

export type MarketView = {
  supplyBtc: number | null;
  marketCapUsd: number | null;
  isPriceLive: boolean;
  isSupplyLive: boolean;
  isMarketLive: boolean;
  priceStatus: string;
  supplyStatus: string;
  marketStatus: string;
  serverNow: number;
};

export function computeMarketView(state: MarketState): MarketView {
  const serverNow = state.now + state.clockOffset;
  const priceFailedOut = state.consecutivePriceFailures >= FAILURE_THRESHOLD;
  const supplyFailedOut = state.consecutiveSupplyFailures >= FAILURE_THRESHOLD;

  const isPriceLive =
    !priceFailedOut
    && state.priceUpdatedAt !== null
    && serverNow - state.priceUpdatedAt <= PRICE_STALE_SECONDS;
  const isSupplyLive =
    !supplyFailedOut
    && state.fetchedAt !== null
    && serverNow - state.fetchedAt <= SUPPLY_STALE_SECONDS;
  const isMarketLive = isPriceLive && isSupplyLive;

  const supplyBtc = state.circulatingSupply !== null
    ? state.circulatingSupply
    : state.blockHeight !== null
      ? issuedSupplyAtHeight(state.blockHeight)
      : null;

  const marketCapUsd =
    state.priceUsd === null || supplyBtc === null
      ? null
      : state.priceUsd * supplyBtc;

  const priceStatus = isPriceLive
    ? 'Live price'
    : state.priceUsd !== null
      ? 'Last known'
      : state.hasAttemptedUpdate
        ? 'Unavailable'
        : 'Loading';

  const supplyStatus = isSupplyLive
    ? 'Live network'
    : supplyBtc !== null
      ? 'Last known'
      : state.hasAttemptedUpdate
        ? 'Unavailable'
        : 'Loading';

  const marketStatus = isMarketLive
    ? 'Live market'
    : marketCapUsd !== null
      ? 'Last known'
      : state.hasAttemptedUpdate
        ? 'Unavailable'
        : 'Loading';

  return {
    supplyBtc,
    marketCapUsd,
    isPriceLive,
    isSupplyLive,
    isMarketLive,
    priceStatus,
    supplyStatus,
    marketStatus,
    serverNow,
  };
}

export function applyMarketPayload(
  prev: MarketState,
  data: Record<string, unknown>,
  headers: Pick<Headers, 'get'>,
  receivedAtSeconds: number,
): MarketState {
  const fetchedAt = data.fetchedAt;
  if (typeof fetchedAt !== 'number' || !Number.isInteger(fetchedAt) || fetchedAt <= 0) {
    throw new Error('Invalid Bitcoin market timestamp');
  }

  const hasValidPrice =
    isValidPriceUsd(data.priceUsd) && isValidPriceUpdatedAt(data.priceUpdatedAt, fetchedAt);
  const hasValidHeight = isValidBlockHeight(data.blockHeight);
  const hasValidSupply = isValidCirculatingSupply(data.circulatingSupply);
  const hasSupplyReading = hasValidSupply || hasValidHeight;

  if (!hasValidPrice && !hasSupplyReading) {
    throw new Error('Invalid Bitcoin market data');
  }

  const nextClockOffset = computeClockOffset(headers, fetchedAt, receivedAtSeconds);
  const nextBlockHeight = hasValidHeight ? (data.blockHeight as number) : prev.blockHeight;
  const nextSupply = hasValidSupply
    ? (data.circulatingSupply as number)
    : hasValidHeight
      ? issuedSupplyAtHeight(data.blockHeight as number)
      : prev.circulatingSupply;

  return {
    blockHeight: nextBlockHeight,
    circulatingSupply: nextSupply,
    priceUsd: hasValidPrice ? (data.priceUsd as number) : prev.priceUsd,
    priceUpdatedAt: hasValidPrice ? (data.priceUpdatedAt as number) : prev.priceUpdatedAt,
    fetchedAt: hasSupplyReading ? fetchedAt : prev.fetchedAt,
    clockOffset: nextClockOffset,
    now: receivedAtSeconds,
    hasAttemptedUpdate: true,
    consecutivePriceFailures: hasValidPrice ? 0 : prev.consecutivePriceFailures + 1,
    consecutiveSupplyFailures: hasSupplyReading ? 0 : prev.consecutiveSupplyFailures + 1,
  };
}

export function applyMarketFailure(prev: MarketState, nowSeconds: number): MarketState {
  return {
    ...prev,
    now: nowSeconds,
    hasAttemptedUpdate: true,
    consecutivePriceFailures: prev.consecutivePriceFailures + 1,
    consecutiveSupplyFailures: prev.consecutiveSupplyFailures + 1,
  };
}

function isPageVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState === 'visible';
}

export default function SupplyHeroModule() {
  const [market, setMarket] = useState<MarketState>(INITIAL_MARKET_STATE);

  useEffect(() => {
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let clockTimer: number | undefined;
    let controller: AbortController | undefined;
    let inFlight = false;
    let lastAttemptMs = 0;

    function clearTimers() {
      if (refreshTimer !== undefined) {
        clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }
      if (clockTimer !== undefined) {
        window.clearInterval(clockTimer);
        clockTimer = undefined;
      }
    }

    function startClock() {
      if (clockTimer !== undefined || !isPageVisible()) return;
      clockTimer = window.setInterval(() => {
        if (!disposed && isPageVisible()) {
          setMarket((prev) => ({ ...prev, now: Date.now() / 1000 }));
        }
      }, CLOCK_TICK_MS);
    }

    function scheduleNextRefresh(delayMs = POLL_INTERVAL_MS) {
      if (disposed || !isPageVisible()) return;
      if (refreshTimer !== undefined) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        void refreshMarketData();
      }, delayMs);
    }

    async function refreshMarketData() {
      if (disposed || inFlight || !isPageVisible()) return;
      inFlight = true;
      lastAttemptMs = Date.now();
      controller = new AbortController();
      const signal = controller.signal;
      const deadline = window.setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch('/api/bitcoin', { cache: 'no-store', signal });
        if (!response.ok) throw new Error('Bitcoin market data is unavailable');
        const data = (await response.json()) as Record<string, unknown>;
        const receivedAt = Date.now() / 1000;
        if (disposed) return;
        if (signal.aborted) throw new Error('Bitcoin market data request timed out');
        setMarket((prev) => applyMarketPayload(prev, data, response.headers, receivedAt));
      } catch {
        if (!disposed) {
          const nowSeconds = Date.now() / 1000;
          setMarket((prev) => applyMarketFailure(prev, nowSeconds));
        }
      } finally {
        inFlight = false;
        window.clearTimeout(deadline);
        if (!disposed && isPageVisible()) {
          // Schedule after completion so slow responses cannot overlap newer requests.
          scheduleNextRefresh(POLL_INTERVAL_MS);
        }
      }
    }

    function handleVisibilityChange() {
      if (disposed) return;
      if (!isPageVisible()) {
        clearTimers();
        return;
      }
      setMarket((prev) => ({ ...prev, now: Date.now() / 1000 }));
      startClock();
      const elapsed = Date.now() - lastAttemptMs;
      if (!inFlight && (lastAttemptMs === 0 || elapsed >= POLL_INTERVAL_MS)) {
        void refreshMarketData();
      } else if (!inFlight) {
        scheduleNextRefresh(Math.max(1_000, POLL_INTERVAL_MS - elapsed));
      }
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (isPageVisible()) {
      startClock();
      void refreshMarketData();
    }

    return () => {
      disposed = true;
      controller?.abort();
      clearTimers();
      if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  const view = computeMarketView(market);

  return (
    <aside
      className="hero-supply-module"
      aria-busy={!market.hasAttemptedUpdate}
      aria-label="Bitcoin market and supply data"
    >
      <div className="metric-module-group">
        <div className="metric-module-head">
          <span><i aria-hidden="true" className={view.isPriceLive ? 'network-live' : ''} /> Bitcoin price</span>
          <b>{view.priceStatus}</b>
        </div>
        <div className="metric-module-number" aria-live="polite">
          <strong>{formatUsd(market.priceUsd)}</strong>
          <small>USD</small>
        </div>
      </div>
      <div className="metric-module-group">
        <div className="metric-module-head">
          <span><i aria-hidden="true" className={view.isSupplyLive ? 'network-live' : ''} /> Bitcoin supply</span>
          <b>{view.supplyStatus}</b>
        </div>
        <div className="metric-module-number" aria-live="polite">
          <strong>{view.supplyBtc === null ? '—' : formatWholeBtc(view.supplyBtc)}</strong>
        </div>
      </div>
      <div className="metric-module-group">
        <div className="metric-module-head">
          <span><i aria-hidden="true" className={view.isMarketLive ? 'network-live' : ''} /> Market cap</span>
          <b>{view.marketStatus}</b>
        </div>
        <div className="metric-module-number" aria-live="polite">
          <strong>{formatMarketCap(view.marketCapUsd)}</strong>
          <small>USD</small>
        </div>
      </div>
      {market.priceUpdatedAt !== null && (
        <small className="market-asof">
          As of{' '}
          <time
            dateTime={new Date(market.priceUpdatedAt * 1000).toISOString()}
            title={new Date(market.priceUpdatedAt * 1000).toLocaleString()}
          >
            {formatAsOfTimestamp(market.priceUpdatedAt, view.serverNow)}
          </time>
        </small>
      )}
      <div className="metric-module-links">
        <a
          href="https://dashboard.secretsatoshis.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Market Dashboard <span aria-hidden="true">↗</span>
        </a>
        <a
          href="https://charts.secretsatoshis.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Charts <span aria-hidden="true">↗</span>
        </a>
      </div>
    </aside>
  );
}
