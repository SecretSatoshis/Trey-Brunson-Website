import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/*
 * The Content-Security-Policy lives here rather than in next.config.ts because it needs
 * a fresh nonce per request, and `headers()` in next.config is static. This is the
 * `proxy` file convention, which replaced `middleware` in Next 16.
 *
 * `script-src 'unsafe-inline'` used to be required by the one inline script the app
 * renders (the JSON-LD block in app/layout.tsx), but it defeats the XSS mitigation the
 * rest of the header set exists to provide: any future reflected or DOM-based injection
 * would execute unimpeded. A per-request nonce lets that one script run while everything
 * else stays blocked.
 *
 * `strict-dynamic` lets the nonced Next bootstrap load its own chunks without each one
 * needing a nonce. CSP3 browsers ignore `'self'` for scripts once it is present; it is
 * kept for older browsers that ignore `strict-dynamic` instead.
 *
 * `style-src` still needs `'unsafe-inline'`: Next inlines critical CSS, and there is no
 * nonce hook for it.
 */
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    'upgrade-insecure-requests',
  ].join('; ');

  // Forwarded so the server components rendering this request can read the nonce.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    /*
     * Every path except static assets, the image optimizer, and the favicon — none of
     * them execute scripts, and running the proxy on them only adds latency. Prefetch
     * requests are excluded too: they are served from the router cache, so a nonce
     * minted for one would never match the document that eventually renders.
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
