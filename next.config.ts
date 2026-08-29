import type { NextConfig } from 'next';

/*
 * Content-Security-Policy is set in middleware.ts, not here: it carries a per-request
 * nonce so the JSON-LD block in app/layout.tsx can run without `script-src
 * 'unsafe-inline'`. Setting it in both places would emit two CSP headers, and browsers
 * enforce the intersection — which would block the nonced script.
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
