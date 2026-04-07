'use client'

import { useEffect, useState } from 'react'
import PenguinLogo from './PenguinLogo'

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'light' | 'dark' | 'done'>('light')

  useEffect(() => {
    // Start light, switch to dark, then hide
    const t1 = setTimeout(() => setPhase('dark'), 600)
    const t2 = setTimeout(() => setPhase('done'), 1800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-colors duration-500 ${
        phase === 'light' ? 'bg-white' : 'bg-black'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute w-32 h-32 rounded-full animate-ping opacity-20 ${
            phase === 'light' ? 'bg-[#1d9bf0]' : 'bg-[#1d9bf0]'
          }`}
          style={{ animationDuration: '1.2s' }}
        />
        <div className={`relative w-20 h-20 transition-all duration-500 ${
          phase === 'light' ? 'scale-100' : 'scale-110'
        }`}>
          <PenguinLogo className={`w-full h-full transition-all duration-500 ${
            phase === 'light' ? 'text-[#0f1419]' : 'text-white'
          }`} />
        </div>
      </div>
    </div>
  )
}
