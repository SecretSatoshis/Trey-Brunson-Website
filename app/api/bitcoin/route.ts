import {
  issuedSupplyAtHeight,
  isValidBlockHeight,
  isValidCirculatingSupply,
  isValidPriceUpdatedAt,
  isValidPriceUsd,
  type BitcoinApiPayload,
  type SupplySource,
} from '@/lib/bitcoin';

const BRK_API = 'https://bitview.space/api';
const MEMPOOL_API = 'https://mempool.space/api';
const USER_AGENT = 'treybrunson.com/1.0 (+https://treybrunson.com)';
const UPSTREAM_TIMEOUT_MS = 8_000;
const MEMORY_CACHE_TTL_MS = 15_000;

type PriceReading = {
  priceUsd: number;
  priceUpdatedAt: number;
};

type UpstreamPricesPayload = {
  USD?: unknown;
  time?: unknown;
};

type CachedEntry = {
  payload: BitcoinApiPayload;
  complete: boolean;
  expiresAtMs: number;
};

let cachedEntry: CachedEntry | null = null;
let inFlightFetch: Promise<CachedEntry | null> | null = null;

export const dynamic = 'force-dynamic';

function logUpstreamError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ service: 'api/bitcoin', context, error: message }));
}

async function fetchWithTimeout(url: string, accept: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: {
        Accept: accept,
        'User-Agent': USER_AGENT,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTipHeight(baseUrl: string, provider: string): Promise<number> {
  const response = await fetchWithTimeout(`${baseUrl}/blocks/tip/height`, 'text/plain');
  if (!response.ok) {
    throw new Error(`${provider} tip height HTTP ${response.status}`);
  }
  const raw = (await response.text()).trim();
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${provider} tip height non-integer payload`);
  }
  const height = Number(raw);
  if (!isValidBlockHeight(height)) {
    throw new Error(`${provider} tip height out of bounds: ${height}`);
  }
  return height;
}

async function fetchPrice(
  baseUrl: string,
  provider: string,
  fetchedAt: number,
): Promise<PriceReading> {
  const response = await fetchWithTimeout(`${baseUrl}/v1/prices`, 'application/json');
  if (!response.ok) {
    throw new Error(`${provider} prices HTTP ${response.status}`);
  }
  const prices = (await response.json()) as UpstreamPricesPayload;
  const priceUsd = prices?.USD;
  const priceUpdatedAt = prices?.time;
  if (!isValidPriceUsd(priceUsd) || !isValidPriceUpdatedAt(priceUpdatedAt, fetchedAt)) {
    throw new Error(`${provider} prices payload failed sanity bounds`);
  }
  return { priceUsd, priceUpdatedAt };
}

function extractSupplyNumber(body: unknown): number | null {
  if (typeof body === 'number') return body;
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return null;
  }
  if (Array.isArray(body) && body.length > 0) {
    return extractSupplyNumber(body[body.length - 1]);
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if ('data' in record) return extractSupplyNumber(record.data);
    if ('value' in record) return extractSupplyNumber(record.value);
  }
  return null;
}

async function fetchBrkCirculatingSupply(): Promise<number> {
  const response = await fetchWithTimeout(
    `${BRK_API}/series/circulating_supply/height/latest`,
    'application/json',
  );
  if (!response.ok) {
    throw new Error(`BRK circulating_supply HTTP ${response.status}`);
  }
  const text = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  const supply = extractSupplyNumber(parsed);
  if (!isValidCirculatingSupply(supply)) {
    throw new Error(`BRK circulating_supply out of bounds: ${String(supply)}`);
  }
  return supply;
}

async function fetchTipHeightWithFailover(): Promise<number | null> {
  try {
    return await fetchTipHeight(BRK_API, 'BRK');
  } catch (brkError) {
    logUpstreamError('brk_height_failed', brkError);
    try {
      return await fetchTipHeight(MEMPOOL_API, 'mempool.space');
    } catch (mempoolError) {
      logUpstreamError('mempool_height_failed', mempoolError);
      return null;
    }
  }
}

async function fetchPriceWithFailover(fetchedAt: number): Promise<PriceReading | null> {
  try {
    return await fetchPrice(BRK_API, 'BRK', fetchedAt);
  } catch (brkError) {
    logUpstreamError('brk_price_failed', brkError);
    try {
      return await fetchPrice(MEMPOOL_API, 'mempool.space', fetchedAt);
    } catch (mempoolError) {
      logUpstreamError('mempool_price_failed', mempoolError);
      return null;
    }
  }
}

async function loadFreshSnapshot(): Promise<CachedEntry | null> {
  const fetchedAt = Math.floor(Date.now() / 1000);

  const [heightResult, priceResult, supplyResult] = await Promise.allSettled([
    fetchTipHeightWithFailover(),
    fetchPriceWithFailover(fetchedAt),
    fetchBrkCirculatingSupply().catch((error) => {
      logUpstreamError('brk_supply_failed', error);
      return null;
    }),
  ]);

  const blockHeight = heightResult.status === 'fulfilled' ? heightResult.value : null;
  const price = priceResult.status === 'fulfilled' ? priceResult.value : null;
  const brkSupply = supplyResult.status === 'fulfilled' ? supplyResult.value : null;

  let circulatingSupply: number | null = null;
  let supplySource: SupplySource | null = null;

  if (brkSupply !== null) {
    circulatingSupply = brkSupply;
    supplySource = 'utxo';
  } else if (blockHeight !== null) {
    circulatingSupply = issuedSupplyAtHeight(blockHeight);
    supplySource = 'scheduled';
  }

  if (price === null && circulatingSupply === null) {
    return null;
  }

  const payload: BitcoinApiPayload = {
    blockHeight,
    circulatingSupply,
    supplySource,
    priceUsd: price?.priceUsd ?? null,
    priceUpdatedAt: price?.priceUpdatedAt ?? null,
    fetchedAt,
  };

  const complete = price !== null && blockHeight !== null && circulatingSupply !== null;
  return {
    payload,
    complete,
    expiresAtMs: Date.now() + MEMORY_CACHE_TTL_MS,
  };
}

function getCoalescedSnapshot(): Promise<CachedEntry | null> {
  if (cachedEntry && cachedEntry.complete && Date.now() < cachedEntry.expiresAtMs) {
    return Promise.resolve(cachedEntry);
  }

  if (!inFlightFetch) {
    inFlightFetch = loadFreshSnapshot()
      .then((entry) => {
        if (entry?.complete) {
          cachedEntry = entry;
        }
        return entry;
      })
      .finally(() => {
        inFlightFetch = null;
      });
  }

  return inFlightFetch;
}

export async function GET(request?: Request) {
  if (request?.url) {
    try {
      const url = new URL(request.url);
      if (url.search) {
        return Response.json(
          { error: 'Unexpected query parameters' },
          {
            status: 400,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }
    } catch {
      return Response.json(
        { error: 'Invalid request URL' },
        {
          status: 400,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }
  }

  try {
    const entry = await getCoalescedSnapshot();
    if (!entry) {
      return Response.json(
        { error: 'Bitcoin market data is temporarily unavailable' },
        {
          status: 503,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    return Response.json(entry.payload, {
      headers: {
        // Complete snapshots may be served from a shared cache for up to 60s.
        // Partial snapshots bypass shared caching so degraded state never lingers.
        'Cache-Control': entry.complete
          ? 'public, s-maxage=30, stale-while-revalidate=30'
          : 'no-store',
      },
    });
  } catch (error) {
    logUpstreamError('unexpected_error', error);
    return Response.json(
      { error: 'Bitcoin market data is temporarily unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
