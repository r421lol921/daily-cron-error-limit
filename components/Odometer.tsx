'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  value: number
  className?: string
}

export default function Odometer({ value, className = '' }: Props) {
  const [displayed, setDisplayed] = useState(value)
  const [animKey, setAnimKey] = useState(0)
  const prevRef = useRef(value)

  useEffect(() => {
    if (value !== prevRef.current) {
      prevRef.current = value
      setAnimKey(k => k + 1)
      setDisplayed(value)
    }
  }, [value])

  const digits = displayed.toString().split('')

  return (
    <span className={`inline-flex overflow-hidden ${className}`} aria-label={displayed.toString()}>
      {digits.map((d, i) => (
        <span
          key={`${animKey}-${i}`}
          className="inline-block odometer-enter"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {d}
        </span>
      ))}
    </span>
  )
}
