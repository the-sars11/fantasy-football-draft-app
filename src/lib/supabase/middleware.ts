import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEV_MODE } from './dev-mode'

const PROTECTED_ROUTES = ['/prep', '/draft', '/settings']
const AUTH_ROUTES = ['/sign-in', '/sign-up', '/forgot-password', '/update-password']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // Dev mode: bypass all auth, redirect auth routes to app
  if (DEV_MODE) {
    if (pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/prep'
      return NextResponse.redirect(url)
    }
    if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
      const url = request.nextUrl.clone()
      url.pathname = '/prep'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — MUST be called immediately after createServerClient
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes
  if (!user && PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth routes
  if (user && AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    const url = request.nextUrl.clone()
    url.pathname = '/prep'
    return NextResponse.redirect(url)
  }

  // Redirect root to prep for authenticated users
  if (user && pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/prep'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
