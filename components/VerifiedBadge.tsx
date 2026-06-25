'use client'

import Image from 'next/image'
import { useState } from 'react'

interface Props {
  className?: string
  size?: number
}

export default function VerifiedBadge({ className = '', size = 18 }: Props) {
  const [hovered, setHovered] = useState(false)

  return (
    <span
      className={`relative inline-flex items-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label="Verified account"
    >
      <Image
        src="/verified-badge.png"
        alt="Verified"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        draggable={false}
      />
      {hovered && (
        <span
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap pointer-events-none z-50"
          style={{ background: 'rgba(0,0,0,0.75)', color: '#fff' }}
        >
          Verified
        </span>
      )}
    </span>
  )
}
