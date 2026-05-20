'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PenguinLogo from '@/components/PenguinLogo'
import { createClient } from '@/lib/supabase/client'

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)
}

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (usernameStatus !== 'available') { setError('Please choose an available username'); return }
    setLoading(true)
    const supabase = createClient()
    const { error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
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

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
          <PenguinLogo className="w-20 h-20 text-primary" />
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

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side – penguin backdrop */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-cover bg-center relative" style={{ backgroundImage: 'url(/penguin-backdrop.jpg)' }}>
        <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <PenguinLogo className="w-14 h-14 text-foreground" />
          </div>

          <h2 className="text-3xl font-black text-foreground mb-2">Create your account</h2>
          <p className="text-foreground-secondary text-sm mb-8">Sign up for free</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
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

            <button
              type="submit"
              disabled={loading || usernameStatus !== 'available'}
              className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Sign up'}
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
