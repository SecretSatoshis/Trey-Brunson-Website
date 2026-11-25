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
function mintNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64');
}

export default function proxy(request: NextRequest) {
  const nonce = mintNonce();

  const isDevelopment = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "img-src 'self' data:",
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
     * Every HTML route except API endpoints, crawler/text files, build assets, the image
     * optimizer and static files in public/ — none of them execute HTML scripts, and
     * minting nonces on them only adds latency. Only Next.js internal router prefetches
     * (`next-router-prefetch`) are skipped; browser full-document prefetches (`Purpose:
     * prefetch` / Speculation Rules) still receive a full nonced CSP header.
     */
    {
      source:
        '/((?!api/|_next/static|_next/image|robots\\.txt|sitemap\\.xml|llms\\.txt|favicon\\.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|txt|xml)$).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
};
