'use client';

import { useEffect, useMemo, useState } from 'react';

function issuedSupplyAtHeight(height: number) {
  let totalSats = 0;
  let eraStart = 0;

  for (let era = 0; era < 64 && eraStart <= height; era += 1) {
    const subsidySats = Math.floor(5_000_000_000 / 2 ** era);
    if (subsidySats === 0) break;

    const blocksInEra = Math.min(height - eraStart + 1, 210_000);
    totalSats += blocksInEra * subsidySats;
    eraStart += 210_000;
  }

  return totalSats / 100_000_000;
}

function formatWholeNumber(value: number) {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

function formatUsd(value: number | null) {
  if (value === null) return '—';

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export default function SupplyHeroModule() {
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [hasAttemptedUpdate, setHasAttemptedUpdate] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    let refresh: ReturnType<typeof setTimeout>;
    let controller: AbortController | undefined;
    const clock = window.setInterval(() => setNow(Date.now() / 1000), 30_000);

    async function refreshMarketData() {
      controller = new AbortController();
      const signal = controller.signal;
      const deadline = window.setTimeout(() => controller?.abort(), 10_000);
      try {
        const response = await fetch('/api/bitcoin', { cache: 'no-store', signal });
        if (!response.ok) throw new Error('Bitcoin market data is unavailable');
        const data = await response.json();
        const receivedAt = Date.now() / 1000;
        if (!Number.isInteger(data.blockHeight) || data.blockHeight <= 0
            || !Number.isFinite(data.priceUsd) || data.priceUsd <= 0
            || !Number.isInteger(data.priceUpdatedAt) || data.priceUpdatedAt <= 0
            || !Number.isInteger(data.fetchedAt) || data.fetchedAt <= 0
            || data.priceUpdatedAt > data.fetchedAt + 60
            || data.fetchedAt > receivedAt + 60) {
          throw new Error('Invalid Bitcoin market data');
        }
        if (disposed) return;
        if (signal.aborted) throw new Error('Bitcoin market data request timed out');
        setBlockHeight(data.blockHeight);
        setPriceUsd(data.priceUsd);
        setPriceUpdatedAt(data.priceUpdatedAt);
        setFetchedAt(data.fetchedAt);
        setRequestFailed(false);
      } catch {
        if (!disposed) setRequestFailed(true);
      } finally {
        window.clearTimeout(deadline);
        if (!disposed) {
          setNow(Date.now() / 1000);
          setHasAttemptedUpdate(true);
          // Schedule after completion so slow responses cannot overlap newer requests.
          refresh = setTimeout(() => { void refreshMarketData(); }, 60_000);
        }
      }
    }

    void refreshMarketData();
    return () => {
      disposed = true;
      controller?.abort();
      clearTimeout(refresh);
      window.clearInterval(clock);
    };
  }, []);

  // Prices update less often than our network-height requests. Expire both labels
  // even when the connection fails or no further response arrives.
  const isPriceLive = !requestFailed && priceUpdatedAt !== null && now - priceUpdatedAt <= 15 * 60;
  const isSupplyLive = !requestFailed && fetchedAt !== null && now - fetchedAt <= 5 * 60;

  const issued = useMemo(
    () => (blockHeight === null ? null : issuedSupplyAtHeight(blockHeight)),
    [blockHeight],
  );
  const marketCapTrillions = priceUsd === null || issued === null
    ? null
    : (priceUsd * issued) / 1_000_000_000_000;
  const priceStatus = isPriceLive
    ? 'Live price'
    : priceUsd !== null
      ? 'Last known'
      : hasAttemptedUpdate
        ? 'Unavailable'
        : 'Loading';
  const supplyStatus = isSupplyLive
    ? 'Live network'
    : issued !== null
      ? 'Last known'
      : hasAttemptedUpdate
        ? 'Unavailable'
        : 'Loading';
  const marketStatus = isPriceLive && isSupplyLive
    ? 'Live market'
    : marketCapTrillions !== null
      ? 'Last known'
      : hasAttemptedUpdate
        ? 'Unavailable'
        : 'Loading';

  return (
    <aside
      className="hero-supply-module"
      aria-busy={!hasAttemptedUpdate}
      aria-label="Bitcoin market and supply data"
    >
      <div className="metric-module-group">
        <div className="metric-module-head">
          <span><i aria-hidden="true" className={isPriceLive ? 'network-live' : ''} /> Bitcoin price</span>
          <b>{priceStatus}</b>
        </div>
        <div className="metric-module-number" aria-live="polite">
          <strong>{formatUsd(priceUsd)}</strong>
          <small>USD</small>
        </div>
      </div>
      <div className="metric-module-group">
        <div className="metric-module-head">
          <span><i aria-hidden="true" className={isSupplyLive ? 'network-live' : ''} /> Bitcoin supply</span>
          <b>{supplyStatus}</b>
        </div>
        <div className="metric-module-number" aria-live="polite">
          <strong>{issued === null ? '—' : formatWholeNumber(issued)}</strong>
        </div>
      </div>
      <div className="metric-module-group">
        <div className="metric-module-head">
          <span><i aria-hidden="true" className={isPriceLive && isSupplyLive ? 'network-live' : ''} /> Market cap</span>
          <b>{marketStatus}</b>
        </div>
        <div className="metric-module-number" aria-live="polite">
          <strong>{marketCapTrillions === null ? '—' : `$${marketCapTrillions.toFixed(2)} Trillion`}</strong>
          <small>USD</small>
        </div>
      </div>
      {priceUpdatedAt !== null && (
        <small className="market-asof">
          As of{' '}
          <time
            dateTime={new Date(priceUpdatedAt * 1000).toISOString()}
            title={new Date(priceUpdatedAt * 1000).toLocaleString()}
          >
            {new Date(priceUpdatedAt * 1000).toLocaleTimeString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </time>
        </small>
      )}
    </aside>
  );
}
