import type { MetadataRoute } from 'next';

const SITE_URL = 'https://treybrunson.com';

// Canonical documents only. The section anchors are navigation, not pages —
// Google consolidates fragments onto the parent URL rather than indexing them.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: new Date('2026-08-27'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
