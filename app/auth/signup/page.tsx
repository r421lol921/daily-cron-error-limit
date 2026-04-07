'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import PenguinLogo from '@/components/PenguinLogo'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
        data: { display_name: displayName || email.split('@')[0] },
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
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
            Click it to activate your account and start posting.
          </p>
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-primary">
        <div className="flex flex-col items-center gap-6 text-white">
          <PenguinLogo className="w-40 h-40 text-white" />
          <h1 className="text-5xl font-black tracking-tight">PeytOtoria</h1>
          <p className="text-xl opacity-80">Join the conversation</p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex justify-center mb-8">
            <PenguinLogo className="w-14 h-14 text-foreground" />
          </div>

          <h2 className="text-3xl font-black text-foreground mb-2">Create your account</h2>
          <p className="text-foreground-secondary text-sm mb-8">Email & password signup</p>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
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
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground placeholder:text-foreground-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

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
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground placeholder:text-foreground-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
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
                placeholder="Min. 6 characters"
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground placeholder:text-foreground-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

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
                className="w-full rounded-md border border-border bg-background px-4 py-3 text-foreground placeholder:text-foreground-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
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
