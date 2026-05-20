interface Props {
  level: number
  size?: number
  className?: string
}

// Gem thresholds — every post = +1 level, +10 gems
export function gemsForLevel(level: number): number {
  return level * 10
}

// Color tiers based on level
function getLevelColors(level: number): { from: string; mid: string; to: string; glow: string; text: string } {
  if (level >= 100) return { from: '#ffd700', mid: '#ff8c00', to: '#b8500a', glow: 'rgba(255,165,0,0.7)', text: '#fff' }
  if (level >= 50)  return { from: '#e8f4ff', mid: '#60a5fa', to: '#1d4ed8', glow: 'rgba(96,165,250,0.6)', text: '#fff' }
  if (level >= 25)  return { from: '#f0fdf4', mid: '#4ade80', to: '#15803d', glow: 'rgba(74,222,128,0.55)', text: '#fff' }
  if (level >= 10)  return { from: '#fff7ed', mid: '#fb923c', to: '#c2410c', glow: 'rgba(251,146,60,0.55)', text: '#fff' }
  // default purple
  return { from: '#f3e8ff', mid: '#c084fc', to: '#7e22ce', glow: 'rgba(168,85,247,0.55)', text: '#fff' }
}

export default function GemBadge({ level, size = 18, className = '' }: Props) {
  const { from, mid, to, glow, text } = getLevelColors(level)
  const fontSize = Math.max(6, Math.round(size * 0.42))
  const iconSize = size * 0.5

  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 select-none ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
      }}
      aria-label={`Level ${level}`}
      role="img"
    >
      {/* Gem SVG shape */}
      <svg
        viewBox="0 0 20 20"
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, filter: `drop-shadow(0 0 ${size * 0.18}px ${glow})` }}
      >
        <defs>
          <linearGradient id={`gem-grad-${level}-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="50%" stopColor={mid} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <linearGradient id={`gem-shine-${level}-${size}`} x1="20%" y1="0%" x2="60%" y2="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        {/* Gem hexagon shape */}
        <polygon
          points="10,1 17,5 17,15 10,19 3,15 3,5"
          fill={`url(#gem-grad-${level}-${size})`}
        />
        {/* Shine overlay */}
        <polygon
          points="10,1 17,5 17,15 10,19 3,15 3,5"
          fill={`url(#gem-shine-${level}-${size})`}
        />
        {/* Inner facet lines */}
        <line x1="10" y1="1" x2="10" y2="8" stroke="rgba(255,255,255,0.3)" strokeWidth="0.6" />
        <line x1="3" y1="5" x2="10" y2="8" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <line x1="17" y1="5" x2="10" y2="8" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      </svg>
      {/* Level number */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          fontSize,
          fontWeight: 900,
          color: text,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          fontFamily: 'inherit',
        }}
      >
        {level}
      </span>
    </span>
  )
}
