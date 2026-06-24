'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  /** Numeric value — the component formats it itself */
  value: number
  /** Override the formatted string (e.g. when you already have it) */
  formatted?: string
  className?: string
}

function formatOdometer(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return n.toLocaleString('en-US')
}

/**
 * Each character slot slides out upward and the new one slides in from below,
 * only when the character changes between renders.
 */
function OdometerDigit({ char, animKey }: { char: string; animKey: number }) {
  const [prev, setPrev] = useState(char)
  const [current, setCurrent] = useState(char)
  const [animating, setAnimating] = useState(false)
  const prevKeyRef = useRef(animKey)

  useEffect(() => {
    if (animKey !== prevKeyRef.current && char !== prev) {
      prevKeyRef.current = animKey
      setCurrent(char)
      setAnimating(true)
      setPrev(char)
      const t = setTimeout(() => setAnimating(false), 350)
      return () => clearTimeout(t)
    }
  }, [char, animKey, prev])

  return (
    <span
      className="inline-flex flex-col overflow-hidden"
      style={{ height: '1.2em', lineHeight: '1.2em', verticalAlign: 'bottom' }}
    >
      <span
        key={animKey}
        style={{
          display: 'inline-block',
          transform: animating ? 'translateY(0)' : 'translateY(0)',
          animation: animating ? 'odometerSlideIn 0.32s cubic-bezier(0.22,1,0.36,1) forwards' : 'none',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'pre',
        }}
      >
        {current}
      </span>
    </span>
  )
}

export default function Odometer({ value, formatted, className = '' }: Props) {
  const str = formatted ?? formatOdometer(value)
  const [displayStr, setDisplayStr] = useState(str)
  const [animKey, setAnimKey] = useState(0)
  const prevRef = useRef(str)

  useEffect(() => {
    const next = formatted ?? formatOdometer(value)
    if (next !== prevRef.current) {
      prevRef.current = next
      setDisplayStr(next)
      setAnimKey(k => k + 1)
    }
  }, [value, formatted])

  return (
    <span
      className={`inline-flex items-end overflow-hidden ${className}`}
      aria-label={displayStr}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    >
      {displayStr.split('').map((char, i) => (
        <OdometerDigit key={i} char={char} animKey={animKey} />
      ))}
    </span>
  )
}
