'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import VerifiedBadge from './VerifiedBadge'
import type { LiveStream } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

function formatViewers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const QUALITY_COLOR: Record<string, string> = {
  '720p': '#4ade80',
  '480p': '#facc15',
  '360p': '#fb923c',
}

interface Props {
  stream: LiveStream
  isOwner: boolean
  onClose: () => void
  onStopped?: () => void
}

export default function LiveViewerModal({ stream: initialStream, isOwner, onClose, onStopped }: Props) {
  const [stream, setStream] = useState<LiveStream>(initialStream)
  const [viewerCount, setViewerCount] = useState(initialStream.viewer_count)
  const [ended, setEnded] = useState(!initialStream.is_live)
  const [stopLoading, setStopLoading] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  const startedAt = new Date(initialStream.started_at).getTime()

  // Elapsed timer (client-side, updates every second)
  useEffect(() => {
    const tick = () => {
      const nowMs = Date.now()
      setElapsedSeconds(Math.floor((nowMs - startedAt) / 1000))
    }
    tick()
    elapsedRef.current = setInterval(tick, 1000)
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current) }
  }, [startedAt])

  // Supabase Realtime: listen for viewer_count changes
  useEffect(() => {
    const channel = supabase
      .channel(`live-stream-${stream.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${stream.id}` },
        (payload) => {
          const updated = payload.new as any
          if (updated.viewer_count !== undefined) setViewerCount(updated.viewer_count)
          if (updated.quality !== undefined) setStream(s => ({ ...s, quality: updated.quality }))
          if (updated.is_live === false) {
            setEnded(true)
            if (elapsedRef.current) clearInterval(elapsedRef.current)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [stream.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Broadcaster: poll /api/live/tick every 30 seconds
  const runTick = useCallback(async () => {
    try {
      const res = await fetch('/api/live/tick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: stream.id }),
      })
      const data = await res.json()
      if (data.forceStopped) {
        setEnded(true)
        if (elapsedRef.current) clearInterval(elapsedRef.current)
        if (tickRef.current) clearInterval(tickRef.current)
        onStopped?.()
        return
      }
      if (data.viewerCount !== undefined) setViewerCount(data.viewerCount)
      if (data.quality !== undefined) setStream(s => ({ ...s, quality: data.quality }))
      if (data.minutesRemaining !== undefined) setMinutesRemaining(data.minutesRemaining)
    } catch {}
  }, [stream.id, onStopped])

  useEffect(() => {
    if (!isOwner || ended) return
    // First tick immediately, then every 30 seconds
    runTick()
    tickRef.current = setInterval(runTick, 30_000)
    return () => { if (tickRef.current) clearInterval(tickRef.current) }
  }, [isOwner, ended, runTick])

  async function handleStop() {
    setStopLoading(true)
    try {
      await fetch('/api/live/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream_id: stream.id }),
      })
      setEnded(true)
      if (tickRef.current) clearInterval(tickRef.current)
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      onStopped?.()
    } catch {}
    setStopLoading(false)
  }

  const profile = stream.profiles
  const qualityHex = QUALITY_COLOR[stream.quality] ?? '#9ca3af'

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Simulated live feed background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #0d0d1a 0%, #12192e 25%, #0a2040 50%, #0d1520 75%, #0d0d1a 100%)',
          backgroundSize: '400% 400%',
          animation: ended ? 'none' : 'liveGradient 6s ease infinite',
        }}
      />
      {/* Subtle scan lines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)',
        }}
      />
      {/* Ended overlay */}
      {ended && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
            </svg>
          </div>
          <p className="text-white font-black text-xl">Stream Ended</p>
          <p className="text-white/60 text-sm">This broadcast has ended</p>
          <button
            onClick={onClose}
            className="mt-2 px-6 py-2.5 rounded-full bg-white text-black font-bold text-sm hover:bg-white/90 transition"
          >
            Close
          </button>
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2">
        {/* Close */}
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* LIVE + quality */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur px-2 py-1 rounded text-[11px] font-bold" style={{ color: qualityHex }}>
            {stream.quality}
          </div>
        </div>

        {/* Viewer count */}
        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white/70" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-white text-xs font-bold tabular-nums">{formatViewers(viewerCount)}</span>
        </div>
      </div>

      {/* Center: Stream title / broadcaster info */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pointer-events-none select-none">
        <div className="text-white/20 text-6xl font-black tracking-widest uppercase mb-2">
          {stream.category}
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="relative z-10 px-4 pb-6 pt-4">
        {/* Broadcaster row */}
        <div className="flex items-center gap-3 mb-4">
          {profile && (
            <Link href={`/profile/${profile.username}`} className="flex items-center gap-2.5 flex-1 min-w-0 pointer-events-auto">
              <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-red-500 flex-shrink-0">
                <Image
                  src={profile.avatar_url || DEFAULT_AVATAR}
                  alt={profile.display_name}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-white font-bold text-sm truncate">{profile.display_name}</span>
                  {profile.is_verified && <VerifiedBadge size={14} />}
                </div>
                <p className="text-white/60 text-xs truncate">{stream.title}</p>
              </div>
            </Link>
          )}
        </div>

        {/* Broadcaster controls */}
        {isOwner && !ended && (
          <div className="flex items-center justify-between bg-black/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/10">
            <div className="text-center">
              <p className="text-white font-black text-lg tabular-nums">{formatElapsed(elapsedSeconds)}</p>
              <p className="text-white/50 text-[10px]">Elapsed</p>
            </div>
            <div className="text-center">
              <p className="font-black text-lg tabular-nums" style={{ color: qualityHex }}>{stream.quality}</p>
              <p className="text-white/50 text-[10px]">Quality</p>
            </div>
            {minutesRemaining !== null && (
              <div className="text-center">
                <p className={`font-black text-lg tabular-nums ${minutesRemaining <= 2 ? 'text-red-400' : 'text-white'}`}>{minutesRemaining}m</p>
                <p className="text-white/50 text-[10px]">Remaining</p>
              </div>
            )}
            <button
              onClick={handleStop}
              disabled={stopLoading}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded-xl transition disabled:opacity-60"
            >
              {stopLoading ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <path d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
              )}
              End Stream
            </button>
          </div>
        )}
      </div>

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
