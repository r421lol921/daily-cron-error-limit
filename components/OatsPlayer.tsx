'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCount } from '@/lib/format'
import type { Profile } from '@/lib/types'
import VerifiedBadge from './VerifiedBadge'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

export interface OatPost {
  id: string
  user_id: string
  caption: string
  video_url: string
  thumbnail_url: string | null
  likes_count: number
  views_count: number
  saves_count: number
  shares_count: number
  is_archived: boolean
  created_at: string
  profiles?: Profile | null
  user_liked?: boolean
  user_saved?: boolean
}

interface Props {
  oat: OatPost
  currentUserId: string | null
  isActive: boolean
  onViewCounted?: () => void
}

export default function OatsPlayer({ oat, currentUserId, isActive, onViewCounted }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(oat.user_liked ?? false)
  const [saved, setSaved] = useState(oat.user_saved ?? false)
  const [likes, setLikes] = useState(oat.likes_count)
  const [saves, setSaves] = useState(oat.saves_count)
  const [views, setViews] = useState(oat.views_count)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showPauseIcon, setShowPauseIcon] = useState(false)
  const viewCountedRef = useRef(false)
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const profile = oat.profiles

  // Play/pause based on active state
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.currentTime = 0
      setProgress(0)
      v.play().catch(() => {
        setMuted(true)
        v.muted = true
        v.play().catch(() => {})
      })
      setPaused(false)
    } else {
      v.pause()
      v.currentTime = 0
      setProgress(0)
      viewCountedRef.current = false
    }
  }, [isActive])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const pct = v.currentTime / v.duration
    setProgress(pct)

    // Count real view at 30% watch time
    if (!viewCountedRef.current && pct >= 0.3 && currentUserId) {
      viewCountedRef.current = true
      setViews(c => c + 1)
      onViewCounted?.()
      const supabase = createClient()
      supabase.from('oats').update({
        views_count: views + 1,
        real_views_count: (oat as any).real_views_count + 1,
      }).eq('id', oat.id)
    }
  }, [currentUserId, views, oat, onViewCounted])

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (v) setDuration(v.duration)
  }, [])

  const handleVideoEnd = useCallback(() => {
    const v = videoRef.current
    if (v) { v.currentTime = 0; v.play().catch(() => {}) }
  }, [])

  function togglePlayPause() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setPaused(false)
    } else {
      v.pause()
      setPaused(true)
    }
    setShowPauseIcon(true)
    if (pauseIconTimer.current) clearTimeout(pauseIconTimer.current)
    pauseIconTimer.current = setTimeout(() => setShowPauseIcon(false), 800)
  }

  async function handleLike() {
    if (!currentUserId) return
    const supabase = createClient()
    if (liked) {
      await supabase.from('oat_likes').delete().match({ user_id: currentUserId, oat_id: oat.id })
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
    } else {
      await supabase.from('oat_likes').insert({ user_id: currentUserId, oat_id: oat.id })
      setLiked(true)
      setLikes(l => l + 1)
    }
  }

  async function handleSave() {
    if (!currentUserId) return
    const supabase = createClient()
    if (saved) {
      await supabase.from('oat_saves').delete().match({ user_id: currentUserId, oat_id: oat.id })
      setSaved(false)
      setSaves(s => Math.max(0, s - 1))
    } else {
      await supabase.from('oat_saves').insert({ user_id: currentUserId, oat_id: oat.id })
      setSaved(true)
      setSaves(s => s + 1)
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: oat.caption, url: window.location.href })
    } catch {
      await navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
  }

  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none">
      {/* Video */}
      <video
        ref={videoRef}
        src={oat.video_url}
        poster={oat.thumbnail_url ?? undefined}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        loop={false}
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleVideoEnd}
        onClick={togglePlayPause}
        aria-label={oat.caption}
      />

      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

      {/* Pause/play flash icon */}
      {showPauseIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/40 rounded-full p-5 animate-ping-once">
            {paused ? (
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor">
                <path d="M6 19h4V5H6zm8-14v14h4V5z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Mute toggle */}
      <button
        onClick={e => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted) } }}
        className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm rounded-full p-2 z-20"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        )}
      </button>

      {/* Right-side action buttons */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5 z-20">
        {/* Profile avatar */}
        {profile && (
          <Link
            href={`/profile/${profile.username}`}
            onClick={e => e.stopPropagation()}
            className="relative flex-shrink-0"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg">
              <Image
                src={profile.avatar_url || DEFAULT_AVATAR}
                alt={profile.display_name}
                width={44}
                height={44}
                className="object-cover w-full h-full"
                unoptimized
              />
            </div>
            {/* Follow + pill */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-black shadow">
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </Link>
        )}

        {/* Like */}
        <div className="relative group/like flex flex-col items-center">
          <button onClick={e => { e.stopPropagation(); handleLike() }} className="flex flex-col items-center gap-1" aria-label="Like">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-125 ${liked ? 'text-pink-500' : 'text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </div>
            <span className="text-white text-[11px] font-medium tracking-tight drop-shadow tabular-nums">{formatCount(likes) || '0'}</span>
          </button>
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/like:opacity-100 transition-opacity">
            <span className="bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-sm">Like</span>
          </div>
        </div>

        {/* Bookmark */}
        <div className="relative group/bm flex flex-col items-center">
          <button onClick={e => { e.stopPropagation(); handleSave() }} className="flex flex-col items-center gap-1" aria-label="Bookmark">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-125 ${saved ? 'text-yellow-400' : 'text-white'}`}>
              <svg viewBox="0 0 24 24" className="w-7 h-7" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
            </div>
            <span className="text-white text-[11px] font-medium tracking-tight drop-shadow tabular-nums">{formatCount(saves) || '0'}</span>
          </button>
          <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/bm:opacity-100 transition-opacity">
            <span className="bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap backdrop-blur-sm">Bookmark</span>
          </div>
        </div>

        {/* Share */}
        <button onClick={e => { e.stopPropagation(); handleShare() }} className="flex flex-col items-center gap-1" aria-label="Share">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-transform active:scale-125">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">Share</span>
        </button>

        {/* Views */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{formatCount(views) || '0'}</span>
        </div>
      </div>

      {/* Bottom: caption + username */}
      <div className="absolute bottom-10 left-3 right-20 z-20 pointer-events-none">
        {profile && (
          <div className="flex items-center gap-1 mb-1">
            <p className="text-white font-bold text-sm drop-shadow">@{profile.username}</p>
            {profile.is_verified && <VerifiedBadge size={14} />}
          </div>
        )}
        {oat.caption && (
          <p className="text-white text-sm leading-relaxed drop-shadow line-clamp-3">{oat.caption}</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-30">
        <div
          className="h-full bg-white rounded-full transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
