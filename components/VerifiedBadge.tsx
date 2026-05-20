interface Props {
  className?: string
  size?: number
}

export default function VerifiedBadge({ className = '', size = 18 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label="Verified account"
      role="img"
    >
      {/* Starburst / shield shape */}
      <path
        d="M12 2L14.39 7.26L20 8.27L16 12.14L16.9 18L12 15.27L7.1 18L8 12.14L4 8.27L9.61 7.26L12 2Z"
        fill="#f97b16"
        stroke="#f97b16"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* White checkmark */}
      <path
        d="M9 12.5L11 14.5L15.5 10"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
