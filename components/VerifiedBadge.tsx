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

      {/* Odometer-style popup */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 z-50"
        style={{
          bottom: `calc(100% + 6px)`,
          transform: 'translateX(-50%)',
          opacity: hovered ? 1 : 0,
          scale: hovered ? '1' : '0.85',
          transition: hovered
            ? 'opacity 0.15s ease, scale 0.18s cubic-bezier(0.22,1,0.36,1)'
            : 'opacity 0.12s ease 0.18s, scale 0.12s ease 0.18s',
        }}
      >
        {/* Outer track — the "drum" housing */}
        <span
          className="relative flex items-center overflow-hidden rounded-md"
          style={{
            height: 22,
            background: 'rgba(10,10,10,0.88)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            padding: '0 8px',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Top highlight line */}
          <span
            className="absolute inset-x-0 top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }}
          />

          {/* Letters roll in one-by-one using staggered animation */}
          {'Verified'.split('').map((char, i) => (
            <span
              key={i}
              className="inline-block"
              style={{
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1,
                opacity: hovered ? 1 : 0,
                transform: hovered ? 'translateY(0)' : 'translateY(100%)',
                transition: hovered
                  ? `opacity 0.18s ease ${i * 28}ms, transform 0.22s cubic-bezier(0.22,1,0.36,1) ${i * 28}ms`
                  : `opacity 0.1s ease ${('Verified'.length - 1 - i) * 18}ms, transform 0.14s ease ${('Verified'.length - 1 - i) * 18}ms`,
              }}
            >
              {char}
            </span>
          ))}

          {/* Bottom shadow line */}
          <span
            className="absolute inset-x-0 bottom-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.6), transparent)' }}
          />
        </span>

        {/* Caret */}
        <span
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -5,
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: '5px solid rgba(10,10,10,0.88)',
          }}
        />
      </span>
    </span>
  )
}
