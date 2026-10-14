import type { MetadataRoute } from 'next';

const SITE_URL = 'https://treybrunson.com';

// Canonical documents only. The section anchors are navigation, not pages —
// Google consolidates fragments onto the parent URL rather than indexing them.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      // The date the page's content last changed. Update it with content edits; a build
      // timestamp would tell crawlers every deploy changed the page.
      lastModified: new Date('2026-10-14'),
      changeFrequency: 'monthly',
      priority: 1,
      // The page's own photo, so image search can attribute it to the page.
      images: [`${SITE_URL}/trey-headshot.webp`],
    },
  ];
}
