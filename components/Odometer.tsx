'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  formatted?: string
  className?: string
}

function formatOdometer(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`
  if (n >= 100_000)   return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en-US')
}

/**
 * A single character slot. When `char` changes we remount the inner span
 * via a `key` increment so the CSS animation replays cleanly every time.
 */
function OdometerChar({ char }: { char: string }) {
  const [animKey, setAnimKey] = useState(0)
  const prevCharRef = useRef(char)

  useEffect(() => {
    if (char !== prevCharRef.current) {
      prevCharRef.current = char
      setAnimKey(k => k + 1)
    }
  }, [char])

  return (
    <span
      className="inline-flex overflow-hidden"
      style={{ height: '1.2em', lineHeight: '1.2em', verticalAlign: 'bottom' }}
    >
      <span
        key={animKey}
        style={{
          display: 'inline-block',
          whiteSpace: 'pre',
          animation: animKey > 0 ? 'odometerSlideIn 0.36s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
        }}
      >
        {char}
      </span>
    </span>
  )
}

export default function Odometer({ value, formatted, className = '' }: Props) {
  const str = formatted ?? formatOdometer(value)

  // Keep a stable display string — only update when value actually changes
  const [displayStr, setDisplayStr] = useState(str)
  const prevRef = useRef(str)

  useEffect(() => {
    const next = formatted ?? formatOdometer(value)
    if (next !== prevRef.current) {
      prevRef.current = next
      setDisplayStr(next)
    }
  }, [value, formatted])

  return (
    <span
      className={`inline-flex items-end ${className}`}
      aria-label={displayStr}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {displayStr.split('').map((char, i) => (
        <OdometerChar key={i} char={char} />
      ))}
    </span>
  )
}
