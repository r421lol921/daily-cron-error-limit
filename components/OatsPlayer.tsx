'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatCount } from '@/lib/format'
import type { Profile } from '@/lib/types'
import VerifiedBadge from './VerifiedBadge'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

function playPop() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.06)
  } catch {}
}

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
  comments_count?: number
  is_archived: boolean
  created_at: string
  profiles?: Profile | null
  user_liked?: boolean
  user_saved?: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  profiles: Profile | null
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
  const [views, setViews] = useState(oat.views_count)
  const [comments, setComments] = useState(oat.comments_count ?? 0)
  const [likeAnim, setLikeAnim] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showPauseIcon, setShowPauseIcon] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showDescription, setShowDescription] = useState(false)
  const [commentsList, setCommentsList] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const viewCountedRef = useRef(false)
  const pauseIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const profile = oat.profiles

  // Tick simulation engine every 8s while active
  useEffect(() => {
    if (!isActive) return
    const tick = () => fetch('/api/simulate', { method: 'POST' }).catch(() => {})
    tick()
    const id = setInterval(tick, 8000)
    return () => clearInterval(id)
  }, [isActive])

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
    if (showComments || showDescription) {
      v.pause()
      setPaused(true)
    } else if (!paused) {
      v.play().catch(() => {})
    }
  }, [showComments, showDescription])

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
    playPop()
    const supabase = createClient()
    if (liked) {
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
      await supabase.from('oat_likes').delete().match({ user_id: currentUserId, oat_id: oat.id })
    } else {
      setLiked(true)
      setLikes(l => l + 1)
      setLikeAnim(true)
      setTimeout(() => setLikeAnim(false), 600)
      await supabase.from('oat_likes').insert({ user_id: currentUserId, oat_id: oat.id })
    }
  }

  async function handleSave() {
    if (!currentUserId) return
    playPop()
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
    try { await navigator.share({ title: oat.caption, url: window.location.href }) }
    catch { await navigator.clipboard.writeText(window.location.href).catch(() => {}) }
  }

  async function openComments() {
    setShowDescription(false)
    setShowComments(true)
    setCommentsLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('oat_comments')
      .select('*, profiles!oat_comments_user_id_fkey(*)')
      .eq('oat_id', oat.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setCommentsList((data as Comment[]) || [])
    setCommentsLoading(false)
  }

  async function postComment() {
    if (!currentUserId || !commentText.trim() || postingComment) return
    setPostingComment(true)
    const supabase = createClient()
    const { data: newComment } = await supabase
      .from('oat_comments')
      .insert({ oat_id: oat.id, user_id: currentUserId, content: commentText.trim() })
      .select('*, profiles!oat_comments_user_id_fkey(*)')
      .single()
    if (newComment) {
      setCommentsList(prev => [newComment as Comment, ...prev])
      setComments(c => c + 1)
    }
    setCommentText('')
    setPostingComment(false)
  }

  function openDescription() {
    setShowComments(false)
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
        <video
          ref={videoRef}
          src={oat.video_url}
          poster={oat.thumbnail_url ?? undefined}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop={false}
          muted={muted}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          onClick={togglePlayPause}
          aria-label={oat.caption}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10 pointer-events-none" />

        {/* Pause/play flash */}
        {showPauseIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-black/40 rounded-full p-5">
              {paused ? (
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-12 h-12 text-white" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
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
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 z-20">

          {/* Profile avatar */}
          {profile && (
            <Link href={`/profile/${profile.username}`} onClick={e => e.stopPropagation()} className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-lg">
                <Image src={profile.avatar_url || DEFAULT_AVATAR} alt={profile.display_name} width={44} height={44} className="object-cover w-full h-full" unoptimized />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-black shadow">
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </Link>
          )}

          {/* Like */}
          <div className="relative group/like flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); handleLike() }}
              className="flex flex-col items-center gap-1"
              aria-label="Like"
            >
              <div className={`w-11 h-11 flex items-center justify-center transition-transform ${liked ? 'text-red-500' : 'text-white'} ${likeAnim ? 'scale-150' : 'active:scale-125'}`}>
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <span className="text-white text-[11px] font-semibold drop-shadow tabular-nums leading-none">{formatCount(likes) || '0'}</span>
            </button>
          </div>

          {/* Comments */}
          <div className="flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); openComments() }}
              className="flex flex-col items-center gap-1"
              aria-label="Comment"
            >
              <div className="w-11 h-11 flex items-center justify-center text-white">
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <span className="text-white text-[11px] font-semibold drop-shadow tabular-nums leading-none">{formatCount(comments) || '0'}</span>
            </button>
          </div>

          {/* Bookmark */}
          <div className="flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); handleSave() }}
              className="flex flex-col items-center gap-1"
              aria-label="Bookmark"
            >
              <div className={`w-11 h-11 flex items-center justify-center transition-transform active:scale-125 ${saved ? 'text-yellow-400' : 'text-white'}`}>
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </div>
              <span className="text-white text-[11px] font-semibold drop-shadow tabular-nums leading-none">{formatCount(saves) || '0'}</span>
            </button>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <button
              onClick={e => { e.stopPropagation(); handleShare() }}
              className="flex flex-col items-center gap-1"
              aria-label="Share"
            >
              <div className="w-11 h-11 flex items-center justify-center text-white transition-transform active:scale-125">
                <svg viewBox="0 0 24 24" className="w-8 h-8 drop-shadow" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </div>
              <span className="text-white text-[11px] font-semibold drop-shadow leading-none">Share</span>
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

        {/* Bottom: username + caption */}
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
          <div className="h-full bg-white rounded-full transition-none" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

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

      {/* Comments bottom sheet */}
      {showComments && (
        <div className="absolute inset-0 z-40 flex flex-col justify-end" onClick={() => setShowComments(false)}>
          <div
            className="bg-background rounded-t-3xl max-h-[70%] flex flex-col overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-foreground/20" />
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <h3 className="font-bold text-foreground text-base">{formatCount(comments) || '0'} Comments</h3>
              <button onClick={() => setShowComments(false)} className="text-foreground-secondary hover:text-foreground transition">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {commentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : commentsList.length === 0 ? (
                <p className="text-foreground-secondary text-sm text-center py-8">No comments yet. Be the first!</p>
              ) : (
                commentsList.map(c => (
                  <div key={c.id} className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                      {c.profiles?.avatar_url ? (
                        <Image src={c.profiles.avatar_url} alt={c.profiles.display_name || ''} width={32} height={32} className="w-full h-full object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full bg-neutral-700" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-foreground">{c.profiles?.display_name || 'User'}</span>
                        {c.profiles?.is_verified && <VerifiedBadge size={10} />}
                      </div>
                      <p className="text-sm text-foreground mt-0.5 leading-relaxed">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {currentUserId ? (
              <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-background">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && postComment()}
                  placeholder="Add a comment..."
                  maxLength={500}
                  className="flex-1 bg-muted rounded-full px-4 py-2 text-sm text-foreground placeholder:text-foreground-secondary outline-none"
                />
                <button
                  onClick={postComment}
                  disabled={!commentText.trim() || postingComment}
                  className="text-primary font-bold text-sm disabled:opacity-40 transition"
                >
                  Post
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-border text-center">
                <Link href="/auth/login" className="text-primary font-semibold text-sm">Sign in to comment</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
