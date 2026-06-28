'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
type PageMode = 'loading' | 'signup' | 'waitlist'

function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
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

export default function SignupPage() {
  const router = useRouter()
  const [mode, setMode] = useState<PageMode>('loading')
  const [userCount, setUserCount] = useState(0)
  const [cap, setCap] = useState(400)

  // Shared fields
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  // Waitlist-specific
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null)

  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // On mount: check whether the site is at capacity
  useEffect(() => {
    async function checkCapacity() {
      try {
        const res = await fetch('/api/waitlist')
        const data = await res.json()
        setUserCount(data.count ?? 0)
        setCap(data.cap ?? 400)
        setMode(data.isFull ? 'waitlist' : 'signup')
      } catch {
        setMode('signup') // fallback to normal signup on error
      }
    }
    checkCapacity()
  }, [])

  // Debounced username availability check
  useEffect(() => {
    if (checkTimeout.current) clearTimeout(checkTimeout.current)
    const raw = username.trim()
    if (!raw) { setUsernameStatus('idle'); return }
    if (raw.length < 3) { setUsernameStatus('invalid'); return }
    if (!/^[a-z0-9_]{3,20}$/.test(raw)) { setUsernameStatus('invalid'); return }

    setUsernameStatus('checking')
    checkTimeout.current = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', raw)
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'available')
    }, 450)

    return () => { if (checkTimeout.current) clearTimeout(checkTimeout.current) }
  }, [username])

  function handleUsernameChange(val: string) {
    setUsername(sanitizeUsername(val))
  }

  // ── Normal signup ──────────────────────────────────────────────────────────
  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (usernameStatus !== 'available') { setError('Please choose an available username'); return }
    setLoading(true)

    // Re-check capacity right before submitting (double guard)
    try {
      const capRes = await fetch('/api/waitlist')
      const capData = await capRes.json()
      if (capData.isFull) {
        setMode('waitlist')
        setLoading(false)
        return
      }
    } catch { /* ignore */ }

    const supabase = createClient()
    const { error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback?next=/home`,
        data: {
          display_name: displayName || username,
          username,
        },
      },
    })
    setLoading(false)
    if (signupErr) {
      setError(signupErr.message)
    } else {
      setDone(true)
    }
  }

  // ── Waitlist join ──────────────────────────────────────────────────────────
  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (usernameStatus !== 'available') { setError('Please choose an available username'); return }
    setLoading(true)

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        display_name: displayName || username,
        username,
        password,
      }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok && !data.position) {
      setError(data.error ?? 'Failed to join waitlist')
      return
    }

    setWaitlistPosition(data.position)
    setDone(true)
  }

  // ── Shared username indicator ──────────────────────────────────────────────
  const usernameIndicator = () => {
    if (usernameStatus === 'checking') return (
      <span className="text-foreground-secondary text-xs flex items-center gap-1">
        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Checking...
      </span>
    )
    if (usernameStatus === 'available') return (
      <span className="text-green-600 text-xs flex items-center gap-1 font-medium">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        @{username} is available
      </span>
    )
    if (usernameStatus === 'taken') return (
      <span className="text-destructive text-xs flex items-center gap-1 font-medium">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        @{username} is already taken
      </span>
    )
    if (usernameStatus === 'invalid') return (
      <span className="text-foreground-secondary text-xs">3–20 characters, letters/numbers/underscore only</span>
    )
    return <span className="text-foreground-secondary text-xs">Letters, numbers, and underscores only</span>
  }

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (mode === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin w-8 h-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-foreground-secondary text-sm">Checking availability...</p>
        </div>
      </div>
    )
  }

  // ── Success screens ────────────────────────────────────────────────────────
  if (done && mode === 'signup') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
          <Image src="/ghost-logo.png" alt="Faundry" width={80} height={80} className="w-20 h-20" />
          <h2 className="text-2xl font-black text-foreground">Check your inbox</h2>
          <p className="text-foreground-secondary">
            We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
            Click it to activate your account.
          </p>
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  if (done && mode === 'waitlist') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-foreground">{"You're on the waitlist!"}</h2>
          <p className="text-foreground-secondary">
            {"You're"} <strong className="text-foreground">#{waitlistPosition}</strong> in line.
            {"We'll"} send an email to <strong className="text-foreground">{email}</strong> as soon as a spot opens up.
          </p>
          <p className="text-foreground-secondary text-sm">
            Spots open up when accounts become inactive. This is usually within a day or two.
          </p>
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  // ── Shared form fields (used in both modes) ────────────────────────────────
  const formFields = (
    <>
      {/* Display name */}
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-semibold text-foreground-secondary">
          Display name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your name"
          className="input-squared"
        />
      </div>

      {/* Username */}
      <div className="flex flex-col gap-1">
        <label htmlFor="username" className="text-sm font-semibold text-foreground-secondary">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground-secondary font-medium select-none">@</span>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => handleUsernameChange(e.target.value)}
            required
            placeholder="yourhandle"
            maxLength={20}
            className={`w-full input-squared pl-8 pr-4 ${
              usernameStatus === 'available'
                ? 'border-green-500'
                : usernameStatus === 'taken'
                ? 'border-destructive'
                : ''
            }`}
          />
        </div>
        <div className="min-h-4">{usernameIndicator()}</div>
      </div>

      {/* Email */}
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

      {/* Password */}
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
          placeholder="Min. 6 characters"
          className="input-squared"
        />
      </div>

      {/* Confirm */}
      <div className="flex flex-col gap-1">
        <label htmlFor="confirm" className="text-sm font-semibold text-foreground-secondary">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
          placeholder="••••••••"
          className="input-squared"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
      )}
    </>
  )

  // ── Waitlist mode UI ───────────────────────────────────────────────────────
  if (mode === 'waitlist') {
    return (
      <div className="min-h-screen flex bg-background">
        {/* Left panel */}
        <div className="hidden lg:flex w-[380px] flex-shrink-0 flex-col items-center justify-center gap-6 bg-primary px-10 py-16 rounded-r-3xl">
          <div className="w-24 h-24 rounded-full bg-primary-foreground/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-12 h-12 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-primary-foreground text-2xl font-black text-center leading-snug text-balance">
            We&apos;re at capacity right now
          </p>
          <p className="text-primary-foreground/70 text-sm text-center text-pretty">
            {userCount.toLocaleString()} / {cap.toLocaleString()} accounts are active.
            Join the waitlist and we&apos;ll let you in as soon as a spot opens.
          </p>
        </div>

        {/* Right form */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          <div className="w-full max-w-sm">
            <div className="lg:hidden flex justify-center mb-8">
              <Image src="/ghost-logo.png" alt="Faundry" width={56} height={56} className="w-14 h-14" />
            </div>

            {/* Waitlist notice banner */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-foreground">Site is full ({userCount.toLocaleString()}/{cap.toLocaleString()} users)</p>
                <p className="text-xs text-foreground-secondary mt-0.5">
                  Fill out the form below to join the waitlist. You&apos;ll be added automatically when a spot opens.
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-black text-foreground mb-2">Join the waitlist</h2>
            <p className="text-foreground-secondary text-sm mb-8">
              Reserve your account — you&apos;ll be added in order when a slot opens.
            </p>

            <form onSubmit={handleWaitlist} className="flex flex-col gap-4">
              {formFields}
              <button
                type="submit"
                disabled={loading || usernameStatus !== 'available'}
                className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <><Spinner /> Joining waitlist...</> : 'Join Waitlist'}
              </button>
            </form>

            <div className="mt-8 text-center text-foreground-secondary text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Normal signup mode ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side – brand panel using primary color token */}
      <div className="hidden lg:flex w-[380px] flex-shrink-0 flex-col items-center justify-center gap-6 bg-primary px-10 py-16 rounded-r-3xl">
        <Image src="/balloon.png" alt="Faundry balloons" width={160} height={160} className="w-40 h-40 object-contain drop-shadow-xl" />
        <p className="text-primary-foreground text-2xl font-black text-center leading-snug text-balance">
          Join Faundry Today!
        </p>
        <p className="text-primary-foreground/70 text-sm text-center text-pretty">
          Join the community — it&apos;s free.
        </p>
      </div>

      {/* Right form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/ghost-logo.png" alt="Faundry" width={56} height={56} className="w-14 h-14" />
          </div>

          <h2 className="text-3xl font-black text-foreground mb-2">Create your account</h2>
          <p className="text-foreground-secondary text-sm mb-8">Sign up for free</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            {formFields}
            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available'}
              className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Creating account...</> : 'Sign up'}
            </button>
          </form>

          <div className="mt-8 text-center text-foreground-secondary text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
