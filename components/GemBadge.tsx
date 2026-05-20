interface Props {
  level: number
  size?: number
  className?: string
}

// Gem thresholds — every post = +1 level, +10 gems
export function gemsForLevel(level: number): number {
  return level * 10
}

export default function GemBadge({ level, size = 18, className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center justify-center flex-shrink-0 rounded-full select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(circle at 35% 35%, #e9d5ff, #a855f7 55%, #7e22ce)',
        boxShadow: '0 0 6px 2px rgba(168,85,247,0.55), 0 0 12px 4px rgba(168,85,247,0.25)',
        fontSize: Math.max(7, Math.round(size * 0.44)),
        fontWeight: 900,
        color: '#000',
        lineHeight: 1,
      }}
      aria-label={`Level ${level}`}
      role="img"
    >
      {level}
    </span>
  )
}
