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
  const [isSupplyLive, setIsSupplyLive] = useState(false);
  const [isPriceLive, setIsPriceLive] = useState(false);
  const [hasAttemptedUpdate, setHasAttemptedUpdate] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function updateMarketData() {
      const response = await fetch('/api/bitcoin', {
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Bitcoin market data is unavailable');

      const data = (await response.json()) as {
        blockHeight?: number;
        priceUsd?: number;
      };
      const receivedLiveHeight = Number.isInteger(data.blockHeight) && (data.blockHeight ?? 0) > 0;
      const receivedLivePrice = typeof data.priceUsd === 'number' && data.priceUsd > 0;

      if (receivedLiveHeight) setBlockHeight(data.blockHeight ?? null);
      if (receivedLivePrice) setPriceUsd(data.priceUsd ?? null);

      setIsSupplyLive(receivedLiveHeight);
      setIsPriceLive(receivedLivePrice);
      setHasAttemptedUpdate(true);
    }

    const refreshMarketData = () => {
      void updateMarketData().catch(() => {
        setIsSupplyLive(false);
        setIsPriceLive(false);
        setHasAttemptedUpdate(true);
      });
    };

    refreshMarketData();
    const refresh = window.setInterval(refreshMarketData, 60_000);

    return () => {
      controller.abort();
      window.clearInterval(refresh);
    };
  }, []);

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
      aria-label="Live Bitcoin market and supply data"
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
    </aside>
  );
}
