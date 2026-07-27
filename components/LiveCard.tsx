'use client'

import Image from 'next/image'
import VerifiedBadge from './VerifiedBadge'
import type { LiveStream } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  stream: LiveStream
  onWatch: () => void
}

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const QUALITY_COLOR: Record<string, string> = {
  '720p': 'text-green-400',
  '480p': 'text-yellow-400',
  '360p': 'text-orange-400',
}

export default function LiveCard({ stream, onWatch }: Props) {
  const profile = stream.profiles
  const qualityClass = QUALITY_COLOR[stream.quality] ?? 'text-foreground-secondary'

  return (
    <button
      onClick={onWatch}
      className="flex-shrink-0 w-52 flex flex-col gap-2 text-left group focus:outline-none"
      aria-label={`Watch ${profile?.display_name ?? 'live stream'}: ${stream.title}`}
    >
      {/* Thumbnail area */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-900 border border-border group-hover:border-red-500/50 transition">
        {/* Fake live feed — animated dark gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)',
            backgroundSize: '400% 400%',
            animation: 'liveGradient 4s ease infinite',
          }}
        />
        {/* Scan-line overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.04) 2px, rgba(255,255,255,0.04) 4px)',
          }}
        />
        {/* LIVE badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
        {/* Quality badge */}
        <div className={`absolute top-2 right-2 text-[10px] font-bold ${qualityClass} bg-black/60 px-1.5 py-0.5 rounded`}>
          {stream.quality}
        </div>
        {/* Viewer count */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {formatViewers(stream.viewer_count)}
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-start gap-2 px-0.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-red-500">
            <Image
              src={profile?.avatar_url || DEFAULT_AVATAR}
              alt={profile?.display_name ?? ''}
              width={28}
              height={28}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-card" />
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-foreground leading-tight line-clamp-1 group-hover:text-red-400 transition">
            {stream.title}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[11px] text-foreground-secondary truncate">
              {profile?.display_name ?? profile?.username}
            </span>
            {profile?.is_verified && <VerifiedBadge size={12} />}
          </div>
          <p className="text-[10px] text-foreground-secondary/70 mt-0.5">{stream.category}</p>
        </div>
      </div>
    </button>
  )
}
