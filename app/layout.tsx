import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const SITE_URL = 'https://treybrunson.com';
const SITE_TITLE = 'Trey Brunson — Bitcoin Industry Professional';
const SITE_DESCRIPTION =
  'Trey Brunson is a Bitcoin industry professional focused on making Bitcoin easier to understand and access.';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: 'Trey Brunson',
  authors: [{ name: 'Trey Brunson', url: SITE_URL }],
  creator: 'Trey Brunson',
  publisher: 'Trey Brunson',
  alternates: { canonical: '/' },
  keywords: ['Trey Brunson', 'Bitcoin', 'Bitcoin research', 'Secret Satoshis'],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Trey Brunson',
    title: 'Trey Brunson — Focused on Bitcoin Since 2016',
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/og.jpg',
        width: 1200,
        height: 630,
        alt: 'Trey Brunson — Focused on Bitcoin since 2016.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trey Brunson — Focused on Bitcoin Since 2016',
    description: SITE_DESCRIPTION,
    images: ['/og.jpg'],
  },
  category: 'technology',
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f2efe7',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': `${SITE_URL}/#person`,
      name: 'Trey Brunson',
      url: `${SITE_URL}/`,
      image: `${SITE_URL}/trey-headshot.webp`,
      description: SITE_DESCRIPTION,
      alumniOf: {
        '@type': 'CollegeOrUniversity',
        name: 'University of Delaware',
      },
      sameAs: [
        'https://www.linkedin.com/in/trey-brunson',
        'https://secretsatoshis.com/',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Trey Brunson',
      description: SITE_DESCRIPTION,
      author: { '@id': `${SITE_URL}/#person` },
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Minted per request by proxy.ts. Without it the JSON-LD block below would
  // require `script-src 'unsafe-inline'`, which would let any injected script run too.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
          }}
        />
        {children}
      </body>
    </html>
  );
}
