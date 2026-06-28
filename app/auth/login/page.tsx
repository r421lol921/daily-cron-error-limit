'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getEmailByUsername } from '@/lib/supabase/profile-actions'

const REMEMBER_KEY = 'faundry_remembered_identifier'

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isUsername(value: string) {
  // A username: no @domain part — treat strings without a dot-domain as usernames
  // Strip leading @ if typed
  return !isEmail(value)
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 inline-block"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setIdentifier(saved)
      setRemember(true)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const raw = identifier.trim()

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, raw)
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }

    let emailToUse = raw

    // If not an email, treat it as a username and look up the email
    if (isUsername(raw)) {
      const username = raw.startsWith('@') ? raw.slice(1) : raw
      const result = await getEmailByUsername(username)
      if (!result.success || !result.email) {
        setError(result.error ?? 'No account found with that username.')
        setLoading(false)
        return
      }
      emailToUse = result.email
    }

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: emailToUse,
      password,
    })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
    } else {
      router.push('/home')
      router.refresh()
    }
  }

  async function handleGuest() {
    setError('')
    setGuestLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError(error.message)
      setGuestLoading(false)
      return
    }
    await fetch('/api/guest-setup', { method: 'POST' })
    setGuestLoading(false)
    router.push('/home')
    router.refresh()
  }

  const anyLoading = loading || guestLoading

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side – brand panel using primary color token */}
      <div className="hidden lg:flex w-[380px] flex-shrink-0 flex-col items-center justify-center gap-6 bg-primary px-10 py-16 rounded-r-3xl">
        <Image src="/balloon.png" alt="Faundry balloons" width={160} height={160} className="w-40 h-40 object-contain drop-shadow-xl" />
        <p className="text-primary-foreground text-2xl font-black text-center leading-snug text-balance">
          Sign In To Faundry! Here.
        </p>
        <p className="text-primary-foreground/70 text-sm text-center text-pretty">
          Connect, share clips, and explore the community.
        </p>
      </div>

      {/* Right side – form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/ghost-logo.png" alt="Faundry" width={56} height={56} className="w-14 h-14" />
          </div>

          <h2 className="text-3xl font-black text-foreground mb-8">Sign in to Faundry.buzz</h2>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="identifier" className="text-sm font-semibold text-foreground-secondary">
                Email or username
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@example.com or @username"
                className="input-squared"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm font-semibold text-foreground-secondary">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-squared"
              />
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-border accent-foreground cursor-pointer"
              />
              <span className="text-sm text-foreground-secondary">Remember me</span>
            </label>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={anyLoading}
              className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          {/* Guest login */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGuest}
              disabled={anyLoading}
              className="w-full rounded-full border border-border bg-transparent py-3 font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-60 text-sm flex items-center justify-center gap-2"
            >
              {guestLoading ? <><Spinner /> Loading...</> : 'Continue as Guest'}
            </button>
          </div>

          <div className="mt-6 text-center text-foreground-secondary text-sm">
            {"Don't have an account?"}{' '}
            <Link href="/auth/signup" className="text-primary font-semibold hover:underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
