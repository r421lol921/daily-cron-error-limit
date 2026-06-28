'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import OatsPlayer, { type OatPost } from './OatsPlayer'
import OatsLogo from './OatsLogo'
import VerifiedBadge from './VerifiedBadge'
import RecommendedProfiles from './RecommendedProfiles'
import LiveCard from './LiveCard'
import GoLiveModal from './GoLiveModal'
import LiveViewerModal from './LiveViewerModal'
import type { Profile, LiveStream } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

/** Thumbnail card that always autoplays silently in the grid */
function ClipPreviewCard({ oat, onClick }: { oat: OatPost; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-[9/16] bg-black overflow-hidden group focus:outline-none"
      aria-label={oat.caption || 'View clip'}
    >
      {oat.video_url ? (
        <video
          src={oat.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : oat.thumbnail_url ? (
        <Image
          src={oat.thumbnail_url}
          alt={oat.caption || 'Clip thumbnail'}
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
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-6">
        <span className="text-white text-[11px] font-bold drop-shadow tabular-nums">
          {oat.views_count > 0 ? oat.views_count.toLocaleString() : '0'}
        </span>
      </div>
    </button>
  )
}

type FeedFilter = 'all' | 'live' | 'following'

interface Props {
  profile: Profile | null
  initialOats: OatPost[]
  currentUserId: string
  recommendedProfiles?: Profile[]
  initialFollowing?: string[]
  initialLiveStreams?: LiveStream[]
}

export default function HomeFeed({
  profile,
  initialOats,
  currentUserId,
  recommendedProfiles = [],
  initialFollowing = [],
  initialLiveStreams = [],
}: Props) {
  const [oats] = useState<OatPost[]>(initialOats)
  const [activeOat, setActiveOat] = useState<OatPost | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [filter, setFilter] = useState<FeedFilter>('all')
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>(initialLiveStreams)
  const [goLiveOpen, setGoLiveOpen] = useState(false)
  const [activeLiveStream, setActiveLiveStream] = useState<LiveStream | null>(null)
  const [isOwnerStream, setIsOwnerStream] = useState(false)
  const [myActiveStream, setMyActiveStream] = useState<LiveStream | null>(null)

  // Poll live streams every 15 seconds
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('/api/live/list')
        const data = await res.json()
        if (data.streams) setLiveStreams(data.streams)
        // Check if current user has an active stream
        const mine = (data.streams as LiveStream[]).find(s => s.user_id === currentUserId)
        setMyActiveStream(mine ?? null)
      } catch {}
    }
    fetchLive()
    const interval = setInterval(fetchLive, 15_000)
    return () => clearInterval(interval)
  }, [currentUserId])

  function openOat(oat: OatPost, index: number) {
    setActiveOat(oat)
    setActiveIndex(index)
  }

  function closeOat() {
    setActiveOat(null)
  }

  function watchStream(stream: LiveStream) {
    setActiveLiveStream(stream)
    setIsOwnerStream(stream.user_id === currentUserId)
  }

  function handleStreamStarted(stream: LiveStream) {
    setMyActiveStream(stream)
    setLiveStreams(prev => [stream, ...prev])
    setActiveLiveStream(stream)
    setIsOwnerStream(true)
  }

  function handleStreamStopped() {
    setMyActiveStream(null)
    setLiveStreams(prev => prev.filter(s => s.id !== activeLiveStream?.id))
    // Don't close modal — LiveViewerModal shows "Stream Ended" state
  }

  const filteredOats = filter === 'live'
    ? [] // Live filter shows only the live strip
    : filter === 'following'
      ? oats.filter(o => initialFollowing.includes((o.profiles as any)?.id ?? ''))
      : oats

  const showLiveStrip = filter !== 'following' && liveStreams.length > 0

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 h-14 gap-3">
          <span className="font-black text-lg text-foreground tracking-tight">Clips</span>
          <div className="flex items-center gap-2">
            {/* Go Live button */}
            {profile && (
              <button
                onClick={() => myActiveStream ? watchStream(myActiveStream) : setGoLiveOpen(true)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold transition ${
                  myActiveStream
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {myActiveStream ? 'Live' : 'Go Live'}
              </button>
            )}
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

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {(['all', 'live', 'following'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                filter === f
                  ? f === 'live'
                    ? 'bg-red-600 text-white'
                    : 'bg-foreground text-background'
                  : 'bg-muted text-foreground-secondary hover:text-foreground'
              }`}
            >
              {f === 'live' && (
                <span className={`w-1.5 h-1.5 rounded-full ${filter === 'live' ? 'bg-white animate-pulse' : 'bg-red-500'}`} />
              )}
              {f === 'all' ? 'All' : f === 'live' ? `Live${liveStreams.length > 0 ? ` (${liveStreams.length})` : ''}` : 'Following'}
            </button>
          ))}
        </div>
      </header>

      {/* Recommended profiles */}
      {recommendedProfiles.length > 0 && filter === 'all' && (
        <RecommendedProfiles
          profiles={recommendedProfiles}
          currentUserId={currentUserId}
          initialFollowing={initialFollowing}
        />
      )}

      {/* Live Now strip */}
      {(showLiveStrip || filter === 'live') && (
        <section className="border-b border-border">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-black text-foreground">Live Now</h2>
              <span className="text-xs text-foreground-secondary">({liveStreams.length})</span>
            </div>
          </div>
          {liveStreams.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-foreground-secondary">No one is live right now.</div>
          ) : (
            <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
              {liveStreams.map(stream => (
                <LiveCard
                  key={stream.id}
                  stream={stream}
                  onWatch={() => watchStream(stream)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Clips grid */}
      {filter !== 'live' && (
        filteredOats.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center px-8">
            <OatsLogo className="w-16 h-16 text-foreground-secondary opacity-40" />
            <p className="text-2xl font-black text-foreground">
              {filter === 'following' ? 'No clips from people you follow' : 'No Clips yet'}
            </p>
            <p className="text-foreground-secondary text-sm">
              {filter === 'following'
                ? 'Follow more people to see their clips here.'
                : 'Short videos will appear here once users start posting.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {filteredOats.map((oat, idx) => (
              <ClipPreviewCard
                key={oat.id}
                oat={oat}
                onClick={() => openOat(oat, idx)}
              />
            ))}
          </div>
        )
      )}

      {/* Full-screen clip viewer */}
      {activeOat && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={closeOat}
            className="absolute top-4 left-4 z-60 bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition"
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
          </div>
        </div>
      )}

      {/* Go Live modal */}
      <GoLiveModal
        isOpen={goLiveOpen}
        onClose={() => setGoLiveOpen(false)}
        onStarted={handleStreamStarted}
      />

      {/* Live stream viewer/broadcaster modal */}
      {activeLiveStream && (
        <LiveViewerModal
          stream={activeLiveStream}
          isOwner={isOwnerStream}
          onClose={() => setActiveLiveStream(null)}
          onStopped={handleStreamStopped}
        />
      )}

      {/* Inline keyframe for live gradient */}
      <style>{`
        @keyframes liveGradient {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}
