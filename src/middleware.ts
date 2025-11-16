import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check for token in cookies first (more reliable for middleware)
  const accessToken = req.cookies.get('access_token')?.value

  if (accessToken) {
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(accessToken)

    if (!error && user) {
      // User is authenticated
      if (req.nextUrl.pathname === '/auth') {
        // Redirect authenticated users away from auth page
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/'
        return NextResponse.redirect(redirectUrl)
      }
      // Allow access to protected routes
      return res
    } else {
      // Token is invalid, clear it
      res.cookies.delete('access_token')
      res.cookies.delete('refresh_token')
    }
  }

  // No valid token found
  if (req.nextUrl.pathname !== '/auth') {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}