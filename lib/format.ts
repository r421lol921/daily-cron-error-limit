/**
 * Format follower / stat counts (Followers, Likes, Views on profile):
 * - Under 100,000: exact with commas  e.g. 59,295  /  2,592  /  29,259
 * - 100K–999,999: whole-number K      e.g. 292K  /  100K
 * - 1M+:          whole-number M      e.g. 1M  /  4M
 */
export function formatFollowers(count: number): string {
  if (count >= 1_000_000) return `${Math.round(count / 1_000_000)}M`
  if (count >= 100_000)   return `${Math.round(count / 1_000)}K`
  return count.toLocaleString('en-US')
}

/**
 * Compact count for action buttons / clip view counts:
 * - Under 1,000,000: exact with commas  e.g. 6,092  /  59,295  /  292,593
 * - 1M+: whole-number M                 e.g. 1M  /  4M
 */
export function formatCount(count: number): string {
  if (count === 0) return ''
  if (count >= 1_000_000) return `${Math.round(count / 1_000_000)}M`
  return count.toLocaleString('en-US')
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
