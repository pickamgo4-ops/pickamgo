import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase() || ''
  const rootDomain = process.env.NEXT_PUBLIC_MARKETPLACE_DOMAIN || 'pickamgo.com'
  const suffix = `.${rootDomain}`

  if (!hostname.endsWith(suffix) || hostname === `www.${rootDomain}`) {
    return NextResponse.next()
  }

  const slug = hostname.slice(0, -suffix.length)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || request.nextUrl.pathname !== '/') {
    return NextResponse.next()
  }

  const storefrontUrl = request.nextUrl.clone()
  storefrontUrl.pathname = `/shop/${slug}`
  return NextResponse.rewrite(storefrontUrl)
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
}
