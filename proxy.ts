import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/*
 * The Content-Security-Policy lives here rather than in next.config.ts because it needs
 * a fresh nonce per request, and `headers()` in next.config is static. This is the
 * `proxy` file convention, which replaced `middleware` in Next 16.
 *
 * Next.js renders inline bootstrap scripts, so without a nonce `script-src` would need
 * 'unsafe-inline' — which defeats the XSS mitigation the rest of the header set exists
 * to provide: any reflected or DOM-based injection would execute unimpeded. Next reads
 * the nonce from the request's CSP header below and attaches it to its runtime, bundles
 * and inline scripts, so those run while anything injected stays blocked. This requires
 * dynamic rendering; app/layout.tsx opts in by reading headers().
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

  const isDevelopment = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
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
