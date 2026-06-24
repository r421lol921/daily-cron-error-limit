import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

// Square "F" wordmark with a small bird sitting on top of the stem
export default function AppLogo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-foreground', className)}
      aria-label="Faundry logo"
    >
      {/* Bird silhouette perched top-right of the F */}
      <g fill="currentColor">
        {/* Bird body */}
        <ellipse cx="28" cy="8" rx="4" ry="2.8" transform="rotate(-10 28 8)" />
        {/* Bird head */}
        <circle cx="31.5" cy="5.5" r="2.2" />
        {/* Beak */}
        <path d="M33.5 5.2 L36 4.8 L33.8 6.2 Z" />
        {/* Tail */}
        <path d="M24.5 9.5 L21 11.5 L24 8.5 Z" />
        {/* Wing hint */}
        <path d="M27 6.5 C28.5 4.5 31 5 31.5 5.5" strokeWidth="1.2" stroke="currentColor" fill="none" strokeLinecap="round" />
      </g>

      {/* Large bold F letterform */}
      <g fill="currentColor">
        {/* Vertical stem */}
        <rect x="8" y="14" width="5.5" height="22" rx="1" />
        {/* Top horizontal bar */}
        <rect x="8" y="14" width="18" height="5" rx="1" />
        {/* Middle horizontal bar */}
        <rect x="8" y="23" width="13" height="4.5" rx="1" />
      </g>
    </svg>
  )
}
