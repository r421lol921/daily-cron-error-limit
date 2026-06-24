'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

const PENGUIN_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png'

export default function LoadingScreen() {
  const [phase, setPhase] = useState<'light' | 'dark' | 'done'>('light')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('dark'), 700)
    const t2 = setTimeout(() => setPhase('done'), 2000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (phase === 'done') return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-700 ${
        phase === 'light' ? 'bg-white' : 'bg-black'
      }`}
    >
      <div className="relative flex items-center justify-center">
        <div
          className="absolute w-36 h-36 rounded-full animate-ping opacity-10 bg-[#1d9bf0]"
          style={{ animationDuration: '1.4s' }}
        />
        <div className={`relative w-24 h-24 transition-all duration-700 ${phase === 'dark' ? 'scale-110' : 'scale-100'}`}>
          <Image
            src={PENGUIN_URL}
            alt="Faundry.buzz"
            width={96}
            height={96}
            className={`w-full h-full object-contain transition-all duration-700 ${phase === 'dark' ? 'invert' : ''}`}
            unoptimized
            priority
          />
        </div>
      </div>
      <p
        className={`mt-6 text-2xl font-black tracking-tight transition-all duration-700 ${
          phase === 'light' ? 'text-[#0f1419]' : 'text-white'
        }`}
      >
        Faundry.buzz
      </p>
    </div>
  )
}
