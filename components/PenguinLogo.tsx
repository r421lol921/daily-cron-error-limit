import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export default function PenguinLogo({ className }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('w-8 h-8', className)}
      aria-label="PeytOtoria penguin logo"
    >
      {/* Body */}
      <ellipse cx="50" cy="62" rx="28" ry="34" fill="currentColor" />
      {/* White belly */}
      <ellipse cx="50" cy="67" rx="17" ry="22" fill="#1d9bf0" />
      {/* Head */}
      <ellipse cx="50" cy="28" rx="22" ry="20" fill="currentColor" />
      {/* Left eye white */}
      <circle cx="42" cy="25" r="5" fill="white" />
      {/* Right eye white */}
      <circle cx="58" cy="25" r="5" fill="white" />
      {/* Left pupil */}
      <circle cx="43" cy="25" r="2.5" fill="#0f1419" />
      {/* Right pupil */}
      <circle cx="59" cy="25" r="2.5" fill="#0f1419" />
      {/* Eye shine left */}
      <circle cx="44" cy="23.5" r="1" fill="white" />
      {/* Eye shine right */}
      <circle cx="60" cy="23.5" r="1" fill="white" />
      {/* Beak */}
      <path d="M45 33 Q50 40 55 33" fill="#f4a422" />
      {/* Left wing */}
      <ellipse cx="22" cy="62" rx="9" ry="20" fill="currentColor" transform="rotate(-10 22 62)" />
      {/* Right wing */}
      <ellipse cx="78" cy="62" rx="9" ry="20" fill="currentColor" transform="rotate(10 78 62)" />
      {/* Left foot */}
      <ellipse cx="39" cy="94" rx="10" ry="5" fill="#f4a422" transform="rotate(-15 39 94)" />
      {/* Right foot */}
      <ellipse cx="61" cy="94" rx="10" ry="5" fill="#f4a422" transform="rotate(15 61 94)" />
    </svg>
  )
}
