const MEMPOOL_API = 'https://mempool.space/api';

type MempoolPrices = {
  USD?: unknown;
  time?: unknown;
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const requestOptions = {
      headers: { Accept: 'application/json' },
      cache: 'no-store' as const,
      signal: controller.signal,
    };
    const [heightResponse, priceResponse] = await Promise.all([
      fetch(`${MEMPOOL_API}/blocks/tip/height`, requestOptions),
      fetch(`${MEMPOOL_API}/v1/prices`, requestOptions),
    ]);

    if (!heightResponse.ok || !priceResponse.ok) {
      throw new Error('Upstream Bitcoin data request failed');
    }

    const blockHeight = Number(await heightResponse.text());
    const prices = (await priceResponse.json()) as MempoolPrices;
    const priceUsd = prices.USD;
    const priceUpdatedAt = prices.time;
    const fetchedAt = Math.floor(Date.now() / 1000);

    if (
      !Number.isInteger(blockHeight)
      || blockHeight <= 0
      || typeof priceUsd !== 'number'
      || !Number.isFinite(priceUsd)
      || priceUsd <= 0
      || typeof priceUpdatedAt !== 'number'
      || !Number.isInteger(priceUpdatedAt)
      || priceUpdatedAt <= 0
      || priceUpdatedAt > fetchedAt + 60
    ) {
      throw new Error('Upstream Bitcoin data response was invalid');
    }

    return Response.json(
      { blockHeight, priceUsd, priceUpdatedAt, fetchedAt },
      {
        headers: {
          // A shared cache may serve this body for up to 60s. The client treats
          // network data older than 5 minutes as no longer live, so the stale window
          // must stay well inside that or a fresh poll would read as "Last known".
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=30',
        },
      },
    );
  } catch {
    return Response.json(
      { error: 'Bitcoin market data is temporarily unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}
