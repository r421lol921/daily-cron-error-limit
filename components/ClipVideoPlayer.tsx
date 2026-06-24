'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  src: string
  poster?: string | null
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  className?: string
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onPlay?: () => void
  onPause?: () => void
}

function formatTime(secs: number): string {
  if (!isFinite(secs) || isNaN(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ClipVideoPlayer({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted: initialMuted = false,
  className = '',
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(initialMuted)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const [showPlayFlash, setShowPlayFlash] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-hide controls after 3 seconds of inactivity
  function resetHideTimer() {
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
    setShowControls(true)
    hideControlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false)
    }, 3000)
  }

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current)
      if (flashTimer.current) clearTimeout(flashTimer.current)
    }
  }, [])

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1))
    }
    onTimeUpdate?.(v.currentTime, v.duration)
  }, [onTimeUpdate])

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
    setIsLoading(false)
    if (autoPlay) {
      v.play().catch(() => { setMuted(true); v.muted = true; v.play().catch(() => {}) })
    }
  }, [autoPlay])

  const handleWaiting = () => setIsLoading(true)
  const handleCanPlay = () => setIsLoading(false)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play().catch(() => {})
      setPlaying(true)
      onPlay?.()
    } else {
      v.pause()
      setPlaying(false)
      onPause?.()
    }
    // Flash icon
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setShowPlayFlash(true)
    flashTimer.current = setTimeout(() => setShowPlayFlash(false), 700)
    resetHideTimer()
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
    resetHideTimer()
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current
    if (!v) return
    const val = parseFloat(e.target.value)
    v.volume = val
    v.muted = val === 0
    setVolume(val)
    setMuted(val === 0)
    resetHideTimer()
  }

  function seekToFraction(fraction: number) {
    const v = videoRef.current
    if (!v || !duration) return
    const t = fraction * duration
    v.currentTime = t
    setCurrentTime(t)
    resetHideTimer()
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekToFraction(fraction)
  }

  function handleProgressMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!seeking) return
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekToFraction(fraction)
  }

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
    resetHideTimer()
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group overflow-hidden select-none ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (playing) setShowControls(false) }}
      onTouchStart={resetHideTimer}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="w-full h-full object-contain"
        playsInline
        loop={loop}
        muted={muted}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => { setPlaying(true); onPlay?.() }}
        onPause={() => { setPlaying(false); onPause?.() }}
        onEnded={() => { setPlaying(false); onEnded?.() }}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        onClick={togglePlay}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg className="w-10 h-10 animate-spin text-white/60" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Play/pause flash */}
      {showPlayFlash && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm animate-ping-once">
            {playing ? (
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
                <path d="M6 19h4V5H6zm8-14v14h4V5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Controls overlay — YouTube-style bottom bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Bottom gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-2 pt-8">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative w-full h-1 rounded-full cursor-pointer mb-2.5 group/bar"
            style={{ height: '3px' }}
            onClick={handleProgressClick}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            onMouseMove={handleProgressMouseMove}
          >
            {/* Track */}
            <div className="absolute inset-0 rounded-full bg-white/25" />
            {/* Buffered */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white/40 transition-none"
              style={{ width: `${bufferedPct}%` }}
            />
            {/* Played */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white transition-none"
              style={{ width: `${progressPct}%` }}
            />
            {/* Thumb — appears on hover */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity -ml-1.5"
              style={{ left: `${progressPct}%` }}
            />
          </div>

          {/* Control row */}
          <div className="flex items-center gap-2">
            {/* Play/pause */}
            <button
              onClick={togglePlay}
              className="text-white p-1 hover:text-white/80 transition flex-shrink-0"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M6 19h4V5H6zm8-14v14h4V5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div
              className="relative flex items-center gap-1.5"
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white p-1 hover:text-white/80 transition flex-shrink-0"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted || volume === 0 ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              {showVolume && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 accent-white cursor-pointer"
                  style={{ accentColor: 'white' }}
                />
              )}
            </div>

            {/* Time */}
            <span className="text-white text-xs font-mono tabular-nums flex-shrink-0 ml-1">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Captions placeholder icon */}
            <button
              className="text-white/60 p-1 hover:text-white transition"
              aria-label="Captions (unavailable)"
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path strokeLinecap="round" d="M7 12h4m-4 3h6M13 12h4" />
              </svg>
            </button>

            {/* Settings placeholder icon */}
            <button
              className="text-white/60 p-1 hover:text-white transition"
              aria-label="Settings"
              onClick={(e) => e.stopPropagation()}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white p-1 hover:text-white/80 transition flex-shrink-0"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
