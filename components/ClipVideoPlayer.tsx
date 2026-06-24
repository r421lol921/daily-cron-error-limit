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

      {/* Controls overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent pointer-events-none" />

        <div className="relative px-3 pb-3 pt-0">
          {/* Progress bar — sits flush at the top of the control area */}
          <div
            ref={progressRef}
            className="relative w-full cursor-pointer mb-3 group/bar"
            style={{ height: '4px', marginTop: 0 }}
            onClick={handleProgressClick}
            onMouseDown={() => setSeeking(true)}
            onMouseUp={() => setSeeking(false)}
            onMouseMove={handleProgressMouseMove}
          >
            <div className="absolute inset-0 rounded-full bg-white/20" />
            <div className="absolute left-0 top-0 h-full rounded-full bg-white/35" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute left-0 top-0 h-full rounded-full bg-white" style={{ width: `${progressPct}%` }} />
            {/* Scrubber thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg -ml-1.5 opacity-0 group-hover/bar:opacity-100 transition-opacity"
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
              {playing
                ? <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
                : <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              }
            </button>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Captions button */}
            <div className="relative">
              <button
                onClick={toggleCaptionsPanel}
                className={`p-1 transition ${captionsEnabled ? 'text-white' : 'text-white/50 hover:text-white'}`}
                aria-label="Captions"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path strokeLinecap="round" d="M6 12h5M6 15h8M14 12h4" />
                </svg>
              </button>

              {/* Captions panel */}
              {showCaptionsPanel && (
                <div
                  className="absolute bottom-9 right-0 w-72 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-2"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-white text-xs font-bold tracking-wide">Captions</span>
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
                    placeholder={"Add your caption lines here.\nOne line per segment."}
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

            {/* Quality / Settings button */}
            <div className="relative">
              <button
                onClick={toggleQualityPanel}
                className="text-white/50 hover:text-white p-1 transition"
                aria-label="Quality settings"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Quality panel */}
              {showQualityPanel && (
                <div
                  className="absolute bottom-9 right-0 w-52 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-3 pt-2.5 pb-1.5 border-b border-white/10">
                    <span className="text-white text-xs font-bold tracking-wide">Quality</span>
                    {nativeHeight > 0 && (
                      <span className="block text-white/40 text-[10px] mt-0.5">
                        Detected: {nativeHeight}p native
                      </span>
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
                          {q.height === nativeHeight && (
                            <span className="text-[9px] text-white/40 bg-white/10 px-1.5 py-0.5 rounded-full">native</span>
                          )}
                          {selectedQuality === q.label && (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white ml-auto" fill="currentColor">
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
              className="text-white p-1 hover:text-white/80 transition flex-shrink-0"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen
                ? <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" /></svg>
                : <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
