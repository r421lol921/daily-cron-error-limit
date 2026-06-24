import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

// Compose / new post icon — square page with a pencil stroke in the corner
export default function ComposeIcon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('', className)}
      aria-hidden="true"
    >
      {/* Page outline */}
      <path
        d="M4 4h10l4 4v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Folded corner */}
      <path
        d="M14 4v4h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Pencil writing line — bottom right */}
      <path
        d="M8 14.5 L14.5 8 L16.5 10 L10 16.5 L7.5 17 L8 14.5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}
