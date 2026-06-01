'use client'

import { useState } from 'react'
import Image from 'next/image'
import OatsPlayer, { type OatPost } from './OatsPlayer'
import VerifiedBadge from './VerifiedBadge'
import type { Profile } from '@/lib/types'
import { formatCount } from '@/lib/format'

interface Props {
  profile: Profile | null
  recommendedOats: OatPost[]
  currentUserId: string | null
}

export default function DiscoverClient({ profile, recommendedOats, currentUserId }: Props) {
  const [activeOat, setActiveOat] = useState<OatPost | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function openOat(oat: OatPost, idx: number) {
    setActiveOat(oat)
    setActiveIndex(idx)
  }

  function close() {
    setActiveOat(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border px-4 py-3">
        <h2 className="text-xl font-bold text-foreground">Discover</h2>
        <p className="text-xs text-foreground-secondary mt-0.5">Recommended Oats for you</p>
      </header>

      {/* Portrait grid */}
      {recommendedOats.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center px-8">
          <p className="text-2xl font-black text-foreground">No Oats yet</p>
          <p className="text-foreground-secondary text-sm">Check back soon for new content.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {recommendedOats.map((oat, idx) => (
            <button
              key={oat.id}
              onClick={() => openOat(oat, idx)}
              className="relative aspect-[9/16] bg-black overflow-hidden group focus:outline-none"
              aria-label={oat.caption || 'View oat'}
            >
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
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-white/30" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                {/* Views pill */}
                <div className="flex items-center gap-1 mb-0.5">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 text-white/80" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-white text-[10px] font-semibold tabular-nums">{formatCount(oat.views_count) || '0'}</span>
                </div>
                {/* Username + verified */}
                {oat.profiles && (
                  <div className="flex items-center gap-1">
                    <span className="text-white text-[10px] font-bold truncate">@{oat.profiles.username}</span>
                    {oat.profiles.is_verified && <VerifiedBadge size={9} />}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Full-screen viewer */}
      {activeOat && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={close}
            className="absolute top-4 left-4 z-60 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="relative w-full h-full max-w-[430px] mx-auto">
            <OatsPlayer
              oat={activeOat}
              currentUserId={currentUserId}
              isActive={true}
              onViewCounted={() => {}}
            />
            {activeIndex > 0 && (
              <button
                onClick={() => { const ni = activeIndex - 1; setActiveIndex(ni); setActiveOat(recommendedOats[ni]) }}
                className="absolute top-1/2 -translate-y-1/2 left-2 z-40 bg-black/40 backdrop-blur-sm rounded-full p-2 text-white hidden sm:flex"
                aria-label="Previous"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            )}
            {activeIndex < recommendedOats.length - 1 && (
              <button
                onClick={() => { const ni = activeIndex + 1; setActiveIndex(ni); setActiveOat(recommendedOats[ni]) }}
                className="absolute top-1/2 -translate-y-1/2 right-2 z-40 bg-black/40 backdrop-blur-sm rounded-full p-2 text-white hidden sm:flex"
                aria-label="Next"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
