import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://treybrunson.com/',
      lastModified: new Date('2026-08-22'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
