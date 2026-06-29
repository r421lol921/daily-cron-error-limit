'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface Props {
  src: string
  poster?: string | null
  autoPlay?: boolean
  loop?: boolean
  muted?: boolean
  className?: string
  caption?: string | null
  onTimeUpdate?: (currentTime: number, duration: number) => void
  onEnded?: () => void
  onPlay?: () => void
  onPause?: () => void
}

// Quality tiers — ordered lowest → highest
const QUALITY_TIERS = [
  { label: '144p',  height: 144 },
  { label: '240p',  height: 240 },
  { label: '360p',  height: 360 },
  { label: '480p',  height: 480 },
  { label: '720p',  height: 720 },
  { label: '1080p', height: 1080 },
  { label: '1440p', height: 1440 },
  { label: '4K',    height: 2160 },
]

export default function ClipVideoPlayer({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted: initialMuted = false,
  className = '',
  caption,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(initialMuted)
  const [volume, setVolume] = useState(1)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const volumeRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [seeking, setSeeking] = useState(false)
  const [showPlayFlash, setShowPlayFlash] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Captions state
  const [captionsText, setCaptionsText] = useState('')
  const [captionsEnabled, setCaptionsEnabled] = useState(false)
  const [showCaptionsPanel, setShowCaptionsPanel] = useState(false)
  const [captionsDraft, setCaptionsDraft] = useState('')

  // Quality state
  const [nativeHeight, setNativeHeight] = useState<number>(0)
  const [selectedQuality, setSelectedQuality] = useState<string>('Auto')
  const [showQualityPanel, setShowQualityPanel] = useState(false)

  // Compute available quality tiers based on native resolution
  const availableQualities = nativeHeight > 0
    ? QUALITY_TIERS.filter(q => q.height <= nativeHeight)
    : []

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

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement) }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Close panels when controls hide
  useEffect(() => {
    if (!showControls) {
      setShowCaptionsPanel(false)
      setShowQualityPanel(false)
    }
  }, [showControls])

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setCurrentTime(v.currentTime)
    if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1))
    onTimeUpdate?.(v.currentTime, v.duration)
  }, [onTimeUpdate])

  const handleLoadedMetadata = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
    setNativeHeight(v.videoHeight)
    setIsLoading(false)
    // Default selected quality to the highest available tier
    const match = [...QUALITY_TIERS].reverse().find(q => q.height <= v.videoHeight)
    if (match) setSelectedQuality(match.label)
    if (autoPlay) {
      v.play().catch(() => { setMuted(true); v.muted = true; v.play().catch(() => {}) })
    }
  }, [autoPlay])

  const handleWaiting = () => setIsLoading(true)
  const handleCanPlay = () => setIsLoading(false)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); onPlay?.() }
    else { v.pause(); setPlaying(false); onPause?.() }
    if (flashTimer.current) clearTimeout(flashTimer.current)
    setShowPlayFlash(true)
    flashTimer.current = setTimeout(() => setShowPlayFlash(false), 700)
    resetHideTimer()
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current
    const val = parseFloat(e.target.value)
    setVolume(val)
    setMuted(val === 0)
    if (v) { v.volume = val; v.muted = val === 0 }
    resetHideTimer()
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation()
    const v = videoRef.current
    if (!v) return
    const newMuted = !muted
    setMuted(newMuted)
    v.muted = newMuted
    if (!newMuted && volume === 0) { setVolume(0.5); v.volume = 0.5 }
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
    seekToFraction(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }

  function handleProgressMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!seeking) return
    const bar = progressRef.current
    if (!bar) return
    const rect = bar.getBoundingClientRect()
    seekToFraction(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)))
  }

  function toggleFullscreen() {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen().catch(() => {})
    else document.exitFullscreen().catch(() => {})
    resetHideTimer()
  }

  /** Split text into ~4-word segments for timed caption display */
  function splitIntoSegments(text: string): string {
    if (!text?.trim()) return ''
    // Split on sentence boundaries first, then chunk long sentences into ~4 words
    const sentences = text.split(/(?<=[.!?,])\s+/)
    const segments: string[] = []
    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/)
      for (let i = 0; i < words.length; i += 4) {
        segments.push(words.slice(i, i + 4).join(' '))
      }
    }
    return segments.join('\n')
  }

  function toggleCaptionsPanel(e: React.MouseEvent) {
    e.stopPropagation()
    setShowQualityPanel(false)
    if (captionsEnabled) {
      // Toggle off
      setCaptionsEnabled(false)
      setCaptionsText('')
      setShowCaptionsPanel(false)
    } else {
      // Auto-generate from caption prop and enable immediately
      const generated = splitIntoSegments(caption || '')
      if (generated) {
        setCaptionsText(generated)
        setCaptionsDraft(generated)
        setCaptionsEnabled(true)
      } else {
        // No caption text — show manual panel as fallback
        setShowCaptionsPanel(v => !v)
        setCaptionsDraft(captionsText)
      }
    }
    resetHideTimer()
  }

  function saveCaptions() {
    setCaptionsText(captionsDraft)
    setCaptionsEnabled(captionsDraft.trim().length > 0)
    setShowCaptionsPanel(false)
  }

  function toggleQualityPanel(e: React.MouseEvent) {
    e.stopPropagation()
    setShowCaptionsPanel(false)
    setShowQualityPanel(v => !v)
    resetHideTimer()
  }

  function pickQuality(label: string) {
    setSelectedQuality(label)
    setShowQualityPanel(false)
    resetHideTimer()
  }

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const bufferedPct  = duration > 0 ? (buffered  / duration) * 100 : 0

  function fmt(secs: number) {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Compute caption lines from captionsText based on current time ratio
  const captionLines = captionsEnabled && captionsText.trim()
    ? captionsText.split('\n').filter(Boolean)
    : []

  // Pick which caption line to show: divide video into equal segments per line
  const currentLine = (() => {
    if (!captionLines.length || duration === 0) return ''
    const segLen = duration / captionLines.length
    const idx = Math.min(Math.floor(currentTime / segLen), captionLines.length - 1)
    return captionLines[idx] ?? ''
  })()

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group overflow-hidden select-none ${className}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (playing) setShowControls(false) }}
      onTouchStart={resetHideTimer}
    >
      {/* Video */}
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
          <div className="bg-black/50 rounded-full p-4 backdrop-blur-sm">
            {playing
              ? <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
              : <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            }
          </div>
        </div>
      )}

      {/* Caption overlay — above controls */}
      {captionsEnabled && currentLine && (
        <div className="absolute bottom-14 inset-x-0 flex justify-center pointer-events-none z-20 px-4">
          <span
            className="bg-black/70 text-white text-sm px-3 py-1 rounded-md text-center max-w-[90%] leading-snug"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 500 }}
          >
            {currentLine}
          </span>
        </div>
      )}

      {/* Controls overlay — YouTube-style flat bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Gradient scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-2 pt-0">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className="relative w-full cursor-pointer mb-2 group/bar"
            style={{ height: '3px', paddingTop: '6px', paddingBottom: '6px', boxSizing: 'content-box', marginTop: 0 }}
            onClick={handleProgressClick}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            onMouseMove={handleProgressMouseMove}
          >
            <div className="absolute inset-x-0 rounded-full bg-white/25" style={{ top: '50%', transform: 'translateY(-50%)', height: '3px' }} />
            <div className="absolute left-0 rounded-full bg-white/40" style={{ top: '50%', transform: 'translateY(-50%)', height: '3px', width: `${bufferedPct}%` }} />
            <div className="absolute left-0 rounded-full bg-white" style={{ top: '50%', transform: 'translateY(-50%)', height: '3px', width: `${progressPct}%` }} />
            {/* Scrubber dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover/bar:opacity-100 transition-opacity"
              style={{ left: `${progressPct}%`, marginLeft: '-6px' }}
            />
          </div>

          {/* Control row — YouTube layout: play | volume+time ... cc | settings | fullscreen */}
          <div className="flex items-center gap-1">

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white p-1 hover:text-white/80 transition flex-shrink-0"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing
                ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
                : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              }
            </button>

            {/* Volume — icon + inline slider on hover */}
            <div
              ref={volumeRef}
              className="flex items-center gap-1 group/vol"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <button
                onClick={toggleMute}
                className="text-white p-1 hover:text-white/80 transition flex-shrink-0"
                aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {(muted || volume === 0)
                  ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  : volume < 0.5
                  ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                  : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                }
              </button>
              {/* Volume slider — appears on hover */}
              <div className={`overflow-hidden transition-all duration-150 ${showVolumeSlider ? 'w-20 opacity-100' : 'w-0 opacity-0'}`}>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onClick={e => e.stopPropagation()}
                  className="w-full h-1 accent-white cursor-pointer"
                  aria-label="Volume"
                />
              </div>
            </div>

            {/* Timestamp */}
            <span className="text-white text-[11px] font-medium tabular-nums ml-0.5 select-none whitespace-nowrap">
              {fmt(currentTime)} / {fmt(duration)}
            </span>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Captions (CC) */}
            <div className="relative">
              <button
                onClick={toggleCaptionsPanel}
                className={`p-1.5 rounded transition ${captionsEnabled ? 'text-white' : 'text-white/60 hover:text-white'}`}
                aria-label="Subtitles/CC"
                title="Subtitles/CC"
              >
                {/* CC box icon */}
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19 4H5a3 3 0 00-3 3v10a3 3 0 003 3h14a3 3 0 003-3V7a3 3 0 00-3-3zM9.5 14.5c.83 0 1.5-.67 1.5-1.5h1.5c0 1.66-1.34 3-3 3S6 14.66 6 13v-2c0-1.66 1.34-3 3-3s3 1.34 3 3H10.5c0-.83-.67-1.5-1.5-1.5S7.5 10.17 7.5 11v2c0 .83.67 1.5 1.5 1.5zm7 0c.83 0 1.5-.67 1.5-1.5h1.5c0 1.66-1.34 3-3 3s-3-1.34-3-3v-2c0-1.66 1.34-3 3-3s3 1.34 3 3H17c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v2c0 .83.67 1.5 1.5 1.5z"/>
                </svg>
              </button>
              {showCaptionsPanel && (
                <div
                  className="absolute bottom-10 right-0 w-72 bg-[#212121] border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-bold tracking-wide">Subtitles / CC</span>
                    <button
                      onClick={() => { setCaptionsEnabled(false); setCaptionsText(''); setShowCaptionsPanel(false) }}
                      className="text-white/50 hover:text-white text-xs"
                    >
                      Clear
                    </button>
                  </div>
                  <textarea
                    value={captionsDraft}
                    onChange={e => setCaptionsDraft(e.target.value)}
                    placeholder={"Add caption lines here.\nOne line per segment."}
                    rows={4}
                    className="w-full bg-white/10 text-white text-xs rounded-lg px-3 py-2 resize-none outline-none placeholder:text-white/30 leading-relaxed"
                  />
                  <p className="text-white/40 text-[10px]">Each line displays in equal time segments across the video.</p>
                  <button
                    onClick={saveCaptions}
                    className="bg-white text-black text-xs font-bold rounded-lg px-3 py-1.5 hover:bg-white/90 transition self-end"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Settings (gear) */}
            <div className="relative">
              <button
                onClick={toggleQualityPanel}
                className="text-white/60 hover:text-white p-1.5 rounded transition relative"
                aria-label="Settings"
                title="Settings"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                {/* Quality badge */}
                {selectedQuality !== 'Auto' && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[8px] font-black leading-none px-1 py-0.5 rounded-sm">
                    {selectedQuality.replace('p', '')}
                  </span>
                )}
              </button>
              {showQualityPanel && (
                <div
                  className="absolute bottom-10 right-0 w-52 bg-[#212121] border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 pt-2.5 pb-1.5 border-b border-white/10">
                    <span className="text-white text-xs font-bold tracking-wide">Quality</span>
                    {nativeHeight > 0 && (
                      <span className="block text-white/40 text-[10px] mt-0.5">Native: {nativeHeight}p</span>
                    )}
                  </div>
                  <ul className="py-1">
                    {availableQualities.length === 0 && (
                      <li className="text-white/40 text-xs px-3 py-2">Detecting...</li>
                    )}
                    {[...availableQualities].reverse().map(q => (
                      <li key={q.label}>
                        <button
                          onClick={() => pickQuality(q.label)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition
                            ${selectedQuality === q.label ? 'text-white font-bold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          <span>{q.label}</span>
                          {selectedQuality === q.label && (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white/60 hover:text-white p-1.5 rounded transition flex-shrink-0"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen
                ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
