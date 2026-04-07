'use client'

import { formatCount } from '@/lib/format'
import Odometer from './Odometer'

interface Props {
  value: number
  className?: string
}

/**
 * Displays a formatted count (e.g., 3.1k, 258k) with animated transitions.
 * Uses Odometer for the raw count animation, then formats the output.
 */
export default function FormattedOdometer({ value, className = '' }: Props) {
  const formatted = formatCount(value)
  
  // If value is 0, return nothing
  if (value === 0) return null

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {formatted}
    </span>
  )
}
