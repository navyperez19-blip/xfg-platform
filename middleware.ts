import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          res = NextResponse.next({ request: { headers: req.headers } })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const isAuthRoute = req.nextUrl.pathname.startsWith('/login') ||
                      req.nextUrl.pathname.startsWith('/signup')

  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

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
