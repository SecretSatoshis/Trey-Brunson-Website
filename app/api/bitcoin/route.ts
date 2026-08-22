const MEMPOOL_API = 'https://mempool.space/api';

type MempoolPrices = {
  USD?: unknown;
};

export const dynamic = 'force-dynamic';

export async function GET() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const requestOptions = {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
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

    if (
      !Number.isInteger(blockHeight)
      || blockHeight <= 0
      || typeof priceUsd !== 'number'
      || !Number.isFinite(priceUsd)
      || priceUsd <= 0
    ) {
      throw new Error('Upstream Bitcoin data response was invalid');
    }

    return Response.json(
      { blockHeight, priceUsd },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
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
