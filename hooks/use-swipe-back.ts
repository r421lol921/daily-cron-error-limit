'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Enables swipe-from-left-edge to go back on mobile.
 * Only activates when touch starts within the left 40px edge zone.
 */
export function useSwipeBack() {
  const router = useRouter()
  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const isEdgeSwipeRef = useRef(false)

  useEffect(() => {
    const EDGE_ZONE = 40      // px from left edge to initiate
    const MIN_SWIPE_X = 80   // minimum horizontal distance to trigger
    const MAX_ANGLE = 35      // max angle from horizontal (degrees)

    function onTouchStart(e: TouchEvent) {
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      isEdgeSwipeRef.current = touch.clientX <= EDGE_ZONE
    }

    function onTouchEnd(e: TouchEvent) {
      if (!isEdgeSwipeRef.current) return
      if (startXRef.current === null || startYRef.current === null) return

      const touch = e.changedTouches[0]
      const dx = touch.clientX - startXRef.current
      const dy = touch.clientY - startYRef.current

      if (dx < MIN_SWIPE_X) return

      const angle = Math.abs(Math.atan2(Math.abs(dy), dx) * (180 / Math.PI))
      if (angle > MAX_ANGLE) return

      router.back()

      startXRef.current = null
      startYRef.current = null
      isEdgeSwipeRef.current = false
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [router])
}
