/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    const apiTarget = process.env.API_SERVER_URL || process.env.NEXT_PUBLIC_API_URL || (
      process.env.NODE_ENV === 'production'
        ? 'https://pickamgo-production.up.railway.app/api'
        : 'http://localhost:4000/api'
    )

    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://maps.gstatic.com; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com https://apis.google.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com http://localhost:* https://*.up.railway.app https://pickamgo-production.up.railway.app; img-src 'self' data: https: http://localhost:*;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
