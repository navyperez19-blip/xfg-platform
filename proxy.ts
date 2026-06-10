import { type NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const isCRMRoute = req.nextUrl.pathname.startsWith('/crm')
  const token = req.cookies.getAll().find(c => c.name.startsWith('sb-'))

  if (isCRMRoute && !token) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirectTo', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/crm/:path*'],
}
