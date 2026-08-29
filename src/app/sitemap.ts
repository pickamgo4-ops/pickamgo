import { MetadataRoute } from 'next'

const baseUrl = 'https://pickamgo.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/discover`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/auth/login`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/auth/signup`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/auth/forgot-password`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/help`, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/track`, changeFrequency: 'daily', priority: 0.7 },
  ]

  return staticPages
}
