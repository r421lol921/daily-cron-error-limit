'use client'

import { useRouter } from 'next/navigation'

export default function StatsUnavailable() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 py-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h2 className="font-bold text-xl text-foreground">Stats</h2>
      </header>

      {/* Unavailable message */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6 py-20">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex flex-col gap-2 max-w-sm">
          <h1 className="font-black text-2xl text-foreground">Page Is Unavailable</h1>
          <p className="text-foreground-secondary text-sm leading-relaxed">
            You may not have access to this page, or it may no longer be available.
          </p>
        </div>
        <button
          onClick={() => router.push('/home')}
          className="mt-2 bg-primary text-primary-foreground rounded-full px-6 py-2.5 font-bold text-sm hover:bg-primary/90 transition"
        >
          Go home
        </button>
      </div>
    </div>
  )
}
