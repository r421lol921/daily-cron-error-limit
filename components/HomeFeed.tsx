'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import OatsPlayer, { type OatPost } from './OatsPlayer'
import OatsLogo from './OatsLogo'
import VerifiedBadge from './VerifiedBadge'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile | null
  initialOats: OatPost[]
  currentUserId: string
}

export default function HomeFeed({ profile, initialOats, currentUserId }: Props) {
  const [oats] = useState<OatPost[]>(initialOats)
  const [activeOat, setActiveOat] = useState<OatPost | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const router = useRouter()

  function openOat(oat: OatPost, index: number) {
    setActiveOat(oat)
    setActiveIndex(index)
  }

  function closeOat() {
    setActiveOat(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Logo/Title */}
          <div className="flex items-center gap-2">
            <OatsLogo className="w-6 h-6 text-foreground" />
            <span className="font-black text-lg text-foreground tracking-tight">Oats</span>
          </div>

          {/* Right: Search + Profile (mobile only) */}
          <div className="flex items-center gap-2 sm:hidden">
            {/* Search button */}
            <Link
              href="/discover"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/10 transition text-foreground"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </Link>

            {/* Profile icon */}
            {profile && (
              <Link
                href={`/profile/${profile.username}`}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-border flex-shrink-0"
                aria-label="Profile"
              >
                <Image
                  src={profile.avatar_url || DEFAULT_AVATAR}
                  alt={profile.display_name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </Link>
            )}
          </div>

          {/* Desktop: show search link as text */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/discover"
              className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-border text-foreground-secondary hover:bg-foreground/10 transition text-sm font-medium"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Search
            </Link>
          </div>
        </div>
      </header>

      {/* Grid of portrait clips */}
      {oats.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center px-8">
          <OatsLogo className="w-16 h-16 text-foreground-secondary opacity-40" />
          <p className="text-2xl font-black text-foreground">No Oats yet</p>
          <p className="text-foreground-secondary text-sm">Short videos will appear here once users start posting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {oats.map((oat, idx) => (
            <button
              key={oat.id}
              onClick={() => openOat(oat, idx)}
              className="relative aspect-[9/16] bg-black overflow-hidden group focus:outline-none"
              aria-label={oat.caption || 'View oat'}
            >
              {/* Thumbnail or black fallback */}
              {oat.thumbnail_url ? (
                <Image
                  src={oat.thumbnail_url}
                  alt={oat.caption || 'Oat clip'}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/40" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-150" />

              {/* Centered play icon — always visible */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-white drop-shadow-lg opacity-80" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              {/* Bottom gradient + view count */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-8">
                <span className="text-white text-[11px] font-bold drop-shadow tabular-nums">
                  {oat.views_count > 0 ? oat.views_count.toLocaleString() : '0'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Full-screen viewer modal */}
      {activeOat && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={closeOat}
            className="absolute top-4 left-4 z-60 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          {/* Player */}
          <div className="relative w-full h-full max-w-[430px] mx-auto">
            <OatsPlayer
              oat={activeOat}
              currentUserId={currentUserId}
              isActive={true}
              onViewCounted={() => {}}
            />

            {/* Swipe up/down on mobile to navigate — no arrow buttons */}
          </div>
        </div>
      )}
    </div>
  )
}
