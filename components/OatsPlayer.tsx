'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatCount } from '@/lib/format'
import type { Profile } from '@/lib/types'
import VerifiedBadge from './VerifiedBadge'
import ClipVideoPlayer from './ClipVideoPlayer'
import Odometer from './Odometer'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

export interface OatPost {
  id: string
  user_id: string
  caption: string
  video_url: string
  thumbnail_url: string | null
  likes_count: number
  views_count: number
  real_views_count?: number
  saves_count: number
  shares_count: number
  is_archived: boolean
  created_at: string
  profiles?: Profile | null
  collab_profile?: Profile | null
  user_liked?: boolean
  user_saved?: boolean
}


interface Props {
  oat: OatPost
  currentUserId: string | null
  isActive: boolean
  onViewCounted?: () => void
}

// Description panel — shown when user clicks "View"
function DescriptionPanel({
  oat,
  likes,
  views,
  onClose,
}: {
  oat: OatPost
  likes: number
  views: number
  onClose: () => void
}) {
  const date = new Date(oat.created_at)
  const monthName = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  const year = date.getFullYear()

  return (
    <div className="flex flex-col h-full bg-[#111] text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold text-white">Description</h2>
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white transition"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Caption text */}
      <p className="px-5 text-sm text-white/80 leading-relaxed min-h-[1.5rem]">
        {oat.caption || '...'}
      </p>

      {/* Divider */}
      <div className="mx-5 mt-4 h-px bg-white/10" />

      {/* Stats card */}
      <div className="mx-4 mt-4 bg-[#1a1a1a] rounded-xl p-4 grid grid-cols-3 divide-x divide-white/10">
        <div className="flex flex-col items-center gap-1 pr-4">
          <span className="text-xl font-black text-white tabular-nums">{formatCount(likes) || '0'}</span>
          <span className="text-xs text-white/50 font-medium">Likes</span>
        </div>
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="text-xl font-black text-white tabular-nums">{formatCount(views) || '0'}</span>
          <span className="text-xs text-white/50 font-medium">Views</span>
        </div>
        <div className="flex flex-col items-center gap-1 pl-4">
          <span className="text-xl font-black text-white">{monthName} {day}</span>
          <span className="text-xs text-white/50 font-medium">{year}</span>
        </div>
      </div>
    </div>
  )
}

export default function OatsPlayer({ oat, currentUserId, isActive, onViewCounted }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [liked, setLiked] = useState(oat.user_liked ?? false)
  const [saved, setSaved] = useState(oat.user_saved ?? false)
  const [likes, setLikes] = useState(oat.likes_count)
  const [saves, setSaves] = useState(oat.saves_count)
  const [shares, setShares] = useState(oat.shares_count ?? 0)
  const [views, setViews] = useState(oat.views_count)
  const [likeAnim, setLikeAnim] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showPauseIcon, setShowPauseIcon] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [showCollab, setShowCollab] = useState(false)

  const viewCountedRef = useRef(false)
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const profile = oat.profiles
  const collabProfile = oat.collab_profile ?? null

  // Trigger simulate on mount + on visibility change/focus (catches profile re-clicks / refresh)
  // Pass combined follower count from both creator + collab so the boost scales with both audiences
  useEffect(() => {
    if (!isActive) return
    const combinedFollowers = (profile?.followers_count ?? 0) + (collabProfile?.followers_count ?? 0)
    const triggerSim = () => fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oat_id: oat.id, follower_boost: combinedFollowers }),
    }).catch(() => {})

    function onFocus() { triggerSim() }
    function onVisible() { if (document.visibilityState === 'visible') triggerSim() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [isActive])

  // Poll live stats every 7s while active so counts update as simulation runs
  useEffect(() => {
    if (!isActive) return
    const supabase = createClient()
    const poll = async () => {
      const { data } = await supabase
        .from('oats')
        .select('views_count, likes_count, saves_count, shares_count')
        .eq('id', oat.id)
        .single()
      if (data) {
        setViews(data.views_count ?? 0)
        setLikes(prev => liked ? prev : (data.likes_count ?? 0))
        setSaves(prev => saved ? prev : (data.saves_count ?? 0))
        setShares(data.shares_count ?? 0)
      }
    }
    const id = setInterval(poll, 7000)
    return () => clearInterval(id)
  }, [isActive, oat.id, liked, saved])

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

  // Pause when any overlay opens
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (showDescription) {
      v.pause()
      setPaused(true)
    } else if (!paused) {
      v.play().catch(() => {})
    }
  }, [showDescription])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const pct = v.currentTime / v.duration
    setProgress(pct)
    if (!viewCountedRef.current && pct >= 0.3 && currentUserId) {
      viewCountedRef.current = true
      setViews(c => c + 1)
      onViewCounted?.()
      const supabase = createClient()
      supabase.from('oats').update({
        views_count: views + 1,
        real_views_count: (oat.real_views_count ?? 0) + 1,
      }).eq('id', oat.id)
    }
  }, [currentUserId, views, oat, onViewCounted])

  const handleVideoEnd = useCallback(() => {
    const v = videoRef.current
    if (v) { v.currentTime = 0; v.play().catch(() => {}) }
  }, [])

  function togglePlayPause() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}); setPaused(false) }
    else { v.pause(); setPaused(true) }
    setShowPauseIcon(true)
    if (pauseIconTimer.current) clearTimeout(pauseIconTimer.current)
    pauseIconTimer.current = setTimeout(() => setShowPauseIcon(false), 800)
  }

  async function handleLike() {
    if (!currentUserId) return
    const supabase = createClient()
    if (liked) {
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
      await supabase.from('oat_likes').delete().match({ user_id: currentUserId, oat_id: oat.id })
    } else {
      setLiked(true)
      setLikes(l => l + 1)
      setLikeAnim(true)
      setTimeout(() => setLikeAnim(false), 700)
      await supabase.from('oat_likes').insert({ user_id: currentUserId, oat_id: oat.id })
    }
  }

  async function handleSave() {
    if (!currentUserId) return
    const supabase = createClient()
    if (saved) {
      setSaved(false)
      setSaves(s => Math.max(0, s - 1))
      await supabase.from('oat_saves').delete().match({ user_id: currentUserId, oat_id: oat.id })
    } else {
      setSaved(true)
      setSaves(s => s + 1)
      await supabase.from('oat_saves').insert({ user_id: currentUserId, oat_id: oat.id })
    }
  }

  async function handleShare() {
    // Always copy link to clipboard — no native share sheet
    const url = window.location.origin + '/clips'
    await navigator.clipboard.writeText(url).catch(() => {})
    setShares(s => s + 1)
    const supabase = createClient()
    supabase.from('oats').update({ shares_count: shares + 1 }).eq('id', oat.id)
  }



  function openDescription() {
    setShowDescription(true)
  }

  // On desktop: show video + description side by side
  // showDescription collapses the right sidebar and shows DescriptionPanel instead
  return (
    <div className="relative w-full h-full bg-black overflow-hidden select-none flex">
      {/* Video layer — shrinks when description is open on desktop */}
      <div
        className={`relative flex-shrink-0 transition-all duration-300 ${
          showDescription ? 'w-0 sm:w-[calc(100%-320px)]' : 'w-full'
        } h-full`}
      >
        {/* Custom dark video player — YouTube inspired */}
        <ClipVideoPlayer
          src={oat.video_url}
          poster={oat.thumbnail_url}
          autoPlay={isActive}
          muted={muted}
          caption={oat.caption}
          className="absolute inset-0 w-full h-full"
          onTimeUpdate={(cur, dur) => {
            if (!dur) return
            const pct = cur / dur
            setProgress(pct)
            if (!viewCountedRef.current && pct >= 0.3 && currentUserId) {
              viewCountedRef.current = true
              setViews(c => c + 1)
              onViewCounted?.()
              const supabase = createClient()
              supabase.from('oats').update({
                views_count: views + 1,
                real_views_count: (oat.real_views_count ?? 0) + 1,
              }).eq('id', oat.id)
            }
          }}
          onEnded={() => { viewCountedRef.current = false }}
          onPause={() => setPaused(true)}
          onPlay={() => setPaused(false)}
        />

        {/* Right-side action buttons */}
        <div className="absolute right-3 bottom-28 flex flex-col items-center gap-4 z-20">

          {/* Avatar(s) — stacked when collab, single when not */}
          {profile && (
            <button
              onClick={e => { e.stopPropagation(); setShowCollab(true) }}
              className="relative flex-shrink-0 focus:outline-none"
              aria-label={collabProfile ? 'View collaborators' : 'View profile'}
              style={{ width: 52, height: collabProfile ? 76 : 44 }}
            >
              {/* Primary avatar — top-left, larger */}
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg absolute top-0 left-0">
                <Image src={profile.avatar_url || DEFAULT_AVATAR} alt={profile.display_name || profile.username} width={44} height={44} className="object-cover w-full h-full" unoptimized />
              </div>
              {/* Collab avatar — lower and shifted right, slightly smaller */}
              {collabProfile && (
                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-lg absolute" style={{ top: 32, left: 12 }}>
                  <Image src={collabProfile.avatar_url || DEFAULT_AVATAR} alt={collabProfile.display_name || collabProfile.username} width={36} height={36} className="object-cover w-full h-full" unoptimized />
                </div>
              )}
            </button>
          )}

          {/* Like */}
          <div className="flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); handleLike() }}
              className="flex flex-col items-center gap-1 relative"
              aria-label="Like"
            >
              {/* Heart burst rings */}
              {likeAnim && (
                <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="w-11 h-11 rounded-full border-2 border-red-400 animate-ping opacity-60" />
                </span>
              )}
              <div className={`w-11 h-11 flex items-center justify-center ${liked ? 'text-red-500' : 'text-white'}`}
                style={{ transform: likeAnim ? 'scale(1.35)' : 'scale(1)', transition: likeAnim ? 'transform 0.15s cubic-bezier(.17,.89,.32,1.49)' : 'transform 0.2s ease' }}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <Odometer value={likes} className="text-white text-[11px] font-semibold tabular-nums drop-shadow" />
            </button>
          </div>

          {/* Bookmark */}
          <div className="flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); handleSave() }}
              className="flex flex-col items-center gap-1"
              aria-label="Bookmark"
            >
              <div className={`w-11 h-11 flex items-center justify-center active:scale-110 transition-transform ${saved ? 'text-yellow-400' : 'text-white'}`}>
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </div>
              <Odometer value={saves} className="text-white text-[11px] font-semibold tabular-nums drop-shadow" />
            </button>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); handleShare() }}
              className="flex flex-col items-center gap-1"
              aria-label="Share — copies link"
            >
              <div className="w-11 h-11 flex items-center justify-center text-white active:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </div>
              <Odometer value={shares} className="text-white text-[11px] font-semibold tabular-nums drop-shadow" />
            </button>
          </div>

          {/* Views + View button */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 flex items-center justify-center text-white">
              <svg viewBox="0 0 24 24" className="w-7 h-7 drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-white text-[11px] font-semibold drop-shadow tabular-nums leading-none">{formatCount(views) || '0'}</span>
            {/* Fat "View" button */}
            <button
              onClick={e => { e.stopPropagation(); openDescription() }}
              className="mt-1 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-[11px] font-bold rounded-md px-3 py-1 transition active:scale-95"
              aria-label="View description"
            >
              View
            </button>
          </div>
        </div>

        {/* Bottom: username(s) + caption */}
        <div className="absolute bottom-16 left-3 right-20 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            {profile && (
              <>
                <p
                  className="text-white text-base drop-shadow-md leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.01em' }}
                >
                  @{profile.username}
                </p>
                {profile.is_verified && <VerifiedBadge size={14} />}
              </>
            )}
            {collabProfile && (
              <>
                <span className="text-white/60 text-sm drop-shadow leading-none" style={{ fontFamily: 'var(--font-display)' }}>&</span>
                <p
                  className="text-white text-base drop-shadow-md leading-none"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '-0.01em' }}
                >
                  @{collabProfile.username}
                </p>
                {collabProfile.is_verified && <VerifiedBadge size={14} />}
              </>
            )}
          </div>
          {oat.caption && (
            <p
              className="text-white/90 leading-snug drop-shadow line-clamp-3"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '0.82rem', letterSpacing: '0.01em' }}
            >
              {oat.caption}
            </p>
          )}
        </div>


      </div>

      {/* ── Collab sheet ── */}
      {showCollab && (
        <div
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCollab(false)}
        >
          <div
            className="bg-[#111] w-full sm:w-[360px] rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            {/* Title */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
              <span className="text-white/60 text-xs tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.12em' }}>
                {collabProfile ? 'Collaborators' : 'Creator'}
              </span>
              <button onClick={() => setShowCollab(false)} className="text-white/30 hover:text-white/80 transition">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Profile cards */}
            <div className="flex flex-col pb-5">
              {([profile, collabProfile] as (typeof profile)[]).filter((p): p is NonNullable<typeof profile> => !!p).map((p, i) => (
                <a
                  key={p.id ?? i}
                  href={`/profile/${p.username}`}
                  className="flex items-center gap-3.5 px-5 py-4 hover:bg-white/4 transition active:bg-white/8"
                  onClick={() => setShowCollab(false)}
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-white/15 flex-shrink-0">
                    <Image src={p.avatar_url || DEFAULT_AVATAR} alt={p.display_name || p.username} width={44} height={44} className="object-cover w-full h-full" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white text-[15px] leading-none truncate" style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}>
                        {p.display_name || p.username}
                      </span>
                      {p.is_verified && <VerifiedBadge size={13} />}
                    </div>
                    <span className="text-white/40 text-xs">@{p.username}</span>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 gap-0.5">
                    <span className="text-white text-sm tabular-nums" style={{ fontFamily: 'var(--font-display)', fontWeight: 400 }}>
                      {(p.followers_count ?? 0).toLocaleString()}
                    </span>
                    <span className="text-white/35 text-[10px] uppercase tracking-wide">followers</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Description panel (right sidebar replacement) ── */}
      {showDescription && (
        <div className="hidden sm:flex flex-col w-[320px] flex-shrink-0 h-full border-l border-white/10">
          <DescriptionPanel oat={oat} likes={likes} views={views} onClose={() => setShowDescription(false)} />
        </div>
      )}

      {/* ── Mobile Description sheet (slide-up) ── */}
      {showDescription && (
        <div
          className="sm:hidden absolute inset-0 z-40 flex flex-col justify-end"
          onClick={() => setShowDescription(false)}
        >
          <div
            className="mobile-modal rounded-t-3xl max-h-[60%] flex flex-col overflow-hidden shadow-2xl"
            style={{ background: '#111' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <DescriptionPanel oat={oat} likes={likes} views={views} onClose={() => setShowDescription(false)} />
          </div>
        </div>
      )}


    </div>
  )
}
