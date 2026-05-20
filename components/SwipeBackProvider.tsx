'use client'

import { useSwipeBack } from '@/hooks/use-swipe-back'

export default function SwipeBackProvider({ children }: { children: React.ReactNode }) {
  useSwipeBack()
  return <>{children}</>
}
