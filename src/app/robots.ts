import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/seller/', '/rider/', '/profile', '/orders', '/cart', '/checkout', '/messages', '/settings', '/addresses', '/favorites', '/notifications', '/security', '/report'],
      },
    ],
    sitemap: 'https://pickamgo.com/sitemap.xml',
  }
}
