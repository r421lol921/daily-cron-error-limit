'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import OatsPlayer, { type OatPost } from './OatsPlayer'
import OatsLogo from './OatsLogo'

function triggerSimulate() {
  fetch('/api/simulate', { method: 'POST' }).catch(() => {})
}

interface Props {
  initialOats: OatPost[]
  currentUserId: string | null
}

export default function OatsClient({ initialOats, currentUserId }: Props) {
  const [oats, setOats] = useState<OatPost[]>(initialOats)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [slideDir, setSlideDir] = useState<'up' | 'down' | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const touchStartTime = useRef(0)

  // Fire simulate on mount, on tab/window focus, and on visibility change
  useEffect(() => {
    triggerSimulate()

    function onFocus() { triggerSimulate() }
    function onVisibility() {
      if (document.visibilityState === 'visible') triggerSimulate()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const goTo = useCallback((nextIndex: number, dir: 'up' | 'down') => {
    if (isAnimating || nextIndex < 0 || nextIndex >= oats.length) return
    setSlideDir(dir)
    setIsAnimating(true)
    setTimeout(() => {
      setActiveIndex(nextIndex)
      setSlideDir(null)
      setIsAnimating(false)
    }, 320)
  }, [isAnimating, oats.length])

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') goTo(activeIndex + 1, 'up')
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') goTo(activeIndex - 1, 'down')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIndex, goTo])

  // Mouse wheel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let wheelTimeout: ReturnType<typeof setTimeout> | null = null
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (wheelTimeout) return
      if (e.deltaY > 30) goTo(activeIndex + 1, 'up')
      else if (e.deltaY < -30) goTo(activeIndex - 1, 'down')
      wheelTimeout = setTimeout(() => { wheelTimeout = null }, 400)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [activeIndex, goTo])

  function onTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dy = touchStartY.current - e.changedTouches[0].clientY
    const dt = Date.now() - touchStartTime.current
    if (Math.abs(dy) > 50 && dt < 500) {
      if (dy > 0) goTo(activeIndex + 1, 'up')
      else goTo(activeIndex - 1, 'down')
    }
  }

  if (oats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <OatsLogo className="w-16 h-16 text-foreground-secondary" />
        <p className="text-2xl font-black text-foreground">No Oats yet</p>
        <p className="text-foreground-secondary text-sm">Short videos will appear here once users start posting.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black"
      style={{ touchAction: 'none' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide strip — renders prev, current, next for smooth animation */}
      <div
        className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
        style={{
          transform: slideDir === 'up'
            ? 'translateY(-100%)'
            : slideDir === 'down'
            ? 'translateY(100%)'
            : 'translateY(0%)',
        }}
      >
        <OatsPlayer
          key={oats[activeIndex].id}
          oat={oats[activeIndex]}
          currentUserId={currentUserId}
          isActive={!isAnimating}
          onViewCounted={() => {}}
        />
      </div>

      {/* Incoming slide */}
      {isAnimating && slideDir && (() => {
        const incomingIndex = slideDir === 'up' ? activeIndex + 1 : activeIndex - 1
        const incomingOat = oats[incomingIndex]
        if (!incomingOat) return null
        return (
          <div
            className="absolute inset-0 transition-transform duration-300 ease-out will-change-transform"
            style={{
              transform: slideDir === 'up' ? 'translateY(0%)' : 'translateY(0%)',
              top: slideDir === 'up' ? '100%' : '-100%',
              animation: `slide-${slideDir}-in 320ms ease-out forwards`,
            }}
          >
            <OatsPlayer
              key={incomingOat.id}
              oat={incomingOat}
              currentUserId={currentUserId}
              isActive={false}
            />
          </div>
        )
      })()}

      {/* Nav dots */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 z-30">
        {oats.slice(Math.max(0, activeIndex - 3), Math.min(oats.length, activeIndex + 4)).map((_, i) => {
          const absIndex = Math.max(0, activeIndex - 3) + i
          return (
            <button
              key={absIndex}
              onClick={() => goTo(absIndex, absIndex > activeIndex ? 'up' : 'down')}
              className={`rounded-full transition-all ${absIndex === activeIndex ? 'w-1.5 h-4 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`}
              aria-label={`Go to oat ${absIndex + 1}`}
            />
          )
        })}
      </div>

      {/* Swipe up/down to navigate (touch & mouse wheel) — no visible arrow buttons */}
    </div>
  )
}
