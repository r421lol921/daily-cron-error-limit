'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const REMEMBER_KEY = 'faundry_remembered_email'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Restore saved email on mount
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY)
    if (saved) {
      setEmail(saved)
      setRemember(true)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (remember) {
      localStorage.setItem(REMEMBER_KEY, email)
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push('/home')
      router.refresh()
    }
  }

  async function handleGuest() {
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInAnonymously()
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Create guest profile via server-side API route (bypasses RLS)
    await fetch('/api/guest-setup', { method: 'POST' })
    setLoading(false)
    router.push('/home')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side – purple panel */}
      <div className="hidden lg:flex w-[380px] flex-shrink-0 flex-col items-center justify-center gap-6 bg-[#7c3aed] px-10 py-16 rounded-r-3xl">
        <Image src="/balloon.png" alt="Faundry balloons" width={160} height={160} className="w-40 h-40 object-contain drop-shadow-xl" />
        <p className="text-white text-2xl font-black text-center leading-snug text-balance">
          Sign In To Faundry! Here.
        </p>
        <p className="text-white/70 text-sm text-center text-pretty">
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
              <label htmlFor="email" className="text-sm font-semibold text-foreground-secondary">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
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
              disabled={loading}
              className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Guest login */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="w-full rounded-full border border-border bg-transparent py-3 font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-60 text-sm"
            >
              Continue as Guest
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
