/**
 * Format follower counts exactly as specified:
 * - Under 1K: exact number
 * - 1K–999K: rounded to nearest K (e.g. 199.2K → 199K, 199.5K → 200K)
 * - 1M–9.99M: one decimal place (e.g. 2.4M, 8.2M)
 * - 10M+: rounded to nearest M (e.g. 10M, 23M, 100M, 234M)
 */
export function formatFollowers(count: number): string {
  if (count >= 1_000_000) {
    const millions = count / 1_000_000
    if (millions >= 10) {
      // 10M+ → round to nearest M
      return `${Math.round(millions)}M`
    }
    // 1M–9.9M → one decimal
    return `${millions.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    // Round to nearest K
    return `${Math.round(count / 1_000)}K`
  }
  return count.toString()
}

/** Compact count for post actions (e.g. 1.1K, 258K, 2.4M) */
export function formatCount(count: number): string {
  if (count === 0) return ''
  if (count >= 1_000_000) {
    const m = count / 1_000_000
    if (m >= 10) return `${Math.round(m)}M`
    return `${m.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (count >= 10_000) {
    // Above 10K: round to nearest K, no decimals (e.g. 258K, 582K)
    return `${Math.round(count / 1_000)}K`
  }
  if (count >= 1_000) {
    // 1K–9.9K: one decimal (e.g. 1.1K, 9.9K)
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return count.toString()
}

/** Relative date: "2h", "Apr 6", etc. */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return `${seconds}s`
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`

  // Same year: just "Apr 6"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  // Different year: "Apr 6, 2024"
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Full date for post detail: "6:30 PM · Apr 6, 2025" */
export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr)
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const day = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${time} · ${day}`
}

/** "April 2025" for join date */
export function formatJoinDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
