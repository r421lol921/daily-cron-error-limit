'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import OatsPlayer, { type OatPost } from './OatsPlayer'
import OatsLogo from './OatsLogo'
import VerifiedBadge from './VerifiedBadge'
import RecommendedProfiles from './RecommendedProfiles'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

/** Thumbnail card that silently plays a 2-second preview on hover/touch */
function ClipPreviewCard({ oat, onClick }: { oat: OatPost; onClick: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [previewing, setPreviewing] = useState(false)

  function startPreview() {
    const vid = videoRef.current
    if (!vid || !oat.video_url) return
    vid.currentTime = 0
    vid.muted = true
    vid.play().catch(() => {})
    setPreviewing(true)
    timerRef.current = setTimeout(() => {
      vid.pause()
      vid.currentTime = 0
      setPreviewing(false)
    }, 2000)
  }

  function stopPreview() {
    const vid = videoRef.current
    if (timerRef.current) clearTimeout(timerRef.current)
    if (vid) { vid.pause(); vid.currentTime = 0 }
    setPreviewing(false)
  }

  return (
    <button
      onClick={onClick}
      onMouseEnter={startPreview}
      onMouseLeave={stopPreview}
      onFocus={startPreview}
      onBlur={stopPreview}
      className="relative aspect-[9/16] bg-black overflow-hidden group focus:outline-none"
      aria-label={oat.caption || 'View clip'}
    >
      {/* Static thumbnail */}
      {oat.thumbnail_url && !previewing && (
        <Image
          src={oat.thumbnail_url}
          alt={oat.caption || 'Clip thumbnail'}
          fill
          className="object-cover"
          unoptimized
        />
      )}

      {/* Silent preview video */}
      {oat.video_url && (
        <video
          ref={videoRef}
          src={oat.video_url}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${previewing ? 'opacity-100' : 'opacity-0'}`}
          muted
          playsInline
          preload="metadata"
        />
      )}

      {/* Fallback when no thumbnail and not previewing */}
      {!oat.thumbnail_url && !previewing && (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/30" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />

      {/* Play icon — hidden while previewing */}
      {!previewing && (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-9 h-9 text-white drop-shadow-lg opacity-70 group-hover:opacity-100 transition-opacity" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      )}

      {/* Bottom: view count */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6">
        <span className="text-white text-[11px] font-bold drop-shadow tabular-nums">
          {oat.views_count > 0 ? oat.views_count.toLocaleString() : '0'}
        </span>
      </div>
    </button>
  )
}

interface Props {
  profile: Profile | null
  initialOats: OatPost[]
  currentUserId: string
  recommendedProfiles?: Profile[]
  initialFollowing?: string[]
}

export default function HomeFeed({ profile, initialOats, currentUserId, recommendedProfiles = [], initialFollowing = [] }: Props) {
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
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          {/* Left: Page title */}
          <span className="font-black text-lg text-foreground tracking-tight">Clips</span>

          {/* Right: Search + Profile */}
          <div className="flex items-center gap-2">
            <Link
              href="/discover"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-foreground/10 transition text-foreground-secondary"
              aria-label="Search"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </Link>
            {profile && (
              <Link
                href={`/profile/${profile.username}`}
                className="w-8 h-8 rounded-full overflow-hidden border border-border flex-shrink-0 hover:opacity-80 transition"
                aria-label="Profile"
              >
                <Image
                  src={profile.avatar_url || DEFAULT_AVATAR}
                  alt={profile.display_name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Recommended profiles horizontal strip */}
      {recommendedProfiles.length > 0 && (
        <RecommendedProfiles
          profiles={recommendedProfiles}
          currentUserId={currentUserId}
          initialFollowing={initialFollowing}
        />
      )}

      {/* Grid of portrait clips */}
      {oats.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center px-8">
          <OatsLogo className="w-16 h-16 text-foreground-secondary opacity-40" />
          <p className="text-2xl font-black text-foreground">No Clips yet</p>
          <p className="text-foreground-secondary text-sm">Short videos will appear here once users start posting.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {oats.map((oat, idx) => (
            <ClipPreviewCard
              key={oat.id}
              oat={oat}
              onClick={() => openOat(oat, idx)}
            />
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
