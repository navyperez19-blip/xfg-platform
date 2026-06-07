import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isCRMRoute = req.nextUrl.pathname.startsWith('/crm')
  const isAuthRoute = req.nextUrl.pathname.startsWith('/login') ||
                      req.nextUrl.pathname.startsWith('/signup')

  // Redirect unauthenticated users to login
  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Redirect authenticated users away from login page
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/pipeline', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/crm/:path*',
    '/pipeline/:path*',
    '/agents/:path*',
    '/admin/:path*',
    '/login',
    '/signup',
  ],
}
