import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Update last_active_at for logged in users (fire-and-forget, never block navigation)
  if (user) {
    supabase
      .from('profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', user.id)
      .then(() => {}) // intentionally ignore errors
  }

  const url = request.nextUrl.clone()
  // /auth/callback must never be intercepted — it exchanges the code for a session
  const isCallback = url.pathname.startsWith('/auth/callback')
  const isAuthPage = url.pathname.startsWith('/auth') && !isCallback
  const isProtected =
    url.pathname.startsWith('/home') ||
    url.pathname.startsWith('/profile') ||
    url.pathname.startsWith('/bookmarks') ||
    url.pathname.startsWith('/post')

  if (!user && isProtected) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
