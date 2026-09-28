import type { NextConfig } from 'next';

/*
 * Content-Security-Policy is set in proxy.ts, not here: it carries a per-request nonce,
 * which Next.js reads from the request's CSP header and attaches to its own runtime,
 * bundle and inline bootstrap scripts, so `script-src` needs no 'unsafe-inline'.
 * Setting it in both places would emit two CSP headers, and browsers enforce the
 * intersection — which would block the nonced scripts.
 */

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
