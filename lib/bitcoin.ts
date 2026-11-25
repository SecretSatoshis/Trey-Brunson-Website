export const MIN_BLOCK_HEIGHT = 840_000;
export const MAX_BLOCK_HEIGHT = 10_000_000;
export const MIN_PRICE_USD = 1_000;
export const MAX_PRICE_USD = 100_000_000;
export const MIN_PRICE_UPDATED_AT = 1_700_000_000;
export const MIN_CIRCULATING_SUPPLY = 19_000_000;
export const MAX_CIRCULATING_SUPPLY = 21_000_000;

export const PRICE_STALE_SECONDS = 15 * 60;
export const SUPPLY_STALE_SECONDS = 5 * 60;
export const STALE_DATE_THRESHOLD_SECONDS = 24 * 60 * 60;

export type SupplySource = 'utxo' | 'scheduled';

export type BitcoinApiPayload = {
  blockHeight: number | null;
  circulatingSupply: number | null;
  supplySource: SupplySource | null;
  priceUsd: number | null;
  priceUpdatedAt: number | null;
  fetchedAt: number;
};

/**
 * Protocol-scheduled BTC subsidy summed through `height` (inclusive), in BTC.
 * Uses integer satoshi math across all 64 halving eras (max 2,099,999,997,690,000
 * sats, well under Number.MAX_SAFE_INTEGER). Note: theoretical scheduled issuance
 * exceeds spendable UTXO supply by ~230+ BTC (unspendable Genesis 50 BTC, BIP-30
 * overwrites, and under-claimed coinbases), so live UTXO supply from BRK is preferred
 * when available.
 */
export function issuedSupplyAtHeight(height: number): number {
  if (!Number.isInteger(height) || height < 0) return 0;

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

export function formatWholeBtc(value: number): string {
  return Math.floor(value).toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
}

export function formatUsd(value: number | null): string {
  if (value === null) return '—';

  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatMarketCap(usdValue: number | null): string {
  if (usdValue === null || !Number.isFinite(usdValue) || usdValue <= 0) return '—';

  if (usdValue < 1_000_000_000_000) {
    return `$${(usdValue / 1_000_000_000).toFixed(2)} Billion`;
  }

  return `$${(usdValue / 1_000_000_000_000).toFixed(2)} Trillion`;
}

export function formatAsOfTimestamp(
  unixSeconds: number,
  referenceUnixSeconds: number,
): string {
  const date = new Date(unixSeconds * 1000);
  const ageSeconds = referenceUnixSeconds > 0
    ? Math.abs(referenceUnixSeconds - unixSeconds)
    : 0;

  if (ageSeconds > STALE_DATE_THRESHOLD_SECONDS) {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Computes server-minus-browser clock offset (in seconds) using RFC 9111 HTTP
 * `Date` + `Age` headers when available so CDN cache age stays visible in
 * `serverNow - fetchedAt`. Falls back to `fetchedAt - receivedAt` if `Date` is absent.
 */
export function computeClockOffset(
  headers: Pick<Headers, 'get'>,
  fetchedAt: number,
  receivedAtSeconds: number,
): number {
  const dateHeader = headers.get('date');
  const ageHeader = headers.get('age');
  const parsedDateMs = dateHeader ? Date.parse(dateHeader) : Number.NaN;

  if (Number.isFinite(parsedDateMs)) {
    const trimmedAge = ageHeader?.trim() ?? '';
    const ageSeconds = /^\d+(?:\.\d+)?$/.test(trimmedAge) ? Number(trimmedAge) : 0;
    return parsedDateMs / 1000 + ageSeconds - receivedAtSeconds;
  }

  return fetchedAt - receivedAtSeconds;
}

export function isValidBlockHeight(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= MIN_BLOCK_HEIGHT
    && value <= MAX_BLOCK_HEIGHT
  );
}

export function isValidPriceUsd(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= MIN_PRICE_USD
    && value <= MAX_PRICE_USD
  );
}

export function isValidPriceUpdatedAt(value: unknown, fetchedAt: number): value is number {
  return (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= MIN_PRICE_UPDATED_AT
    && value <= fetchedAt + 60
  );
}

export function isValidCirculatingSupply(value: unknown): value is number {
  return (
    typeof value === 'number'
    && Number.isFinite(value)
    && value >= MIN_CIRCULATING_SUPPLY
    && value <= MAX_CIRCULATING_SUPPLY
  );
}
