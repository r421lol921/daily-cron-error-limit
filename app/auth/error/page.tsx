import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-sm w-full text-center flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-2xl font-black text-foreground">Something went wrong</h2>
        <p className="text-foreground-secondary">
          The confirmation link may have expired or already been used. Please try signing in or request a new link.
        </p>
        <div className="flex flex-col gap-3 w-full">
          <Link
            href="/auth/login"
            className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground text-center transition hover:bg-primary/90"
          >
            Sign in
          </Link>
          <Link
            href="/auth/signup"
            className="w-full rounded-full border border-border py-3 font-semibold text-foreground text-center transition hover:bg-surface"
          >
            Create a new account
          </Link>
        </div>
      </div>
    </div>
  )
}
