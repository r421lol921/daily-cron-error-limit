// Oat grain / sprout logo mark for the Oats short-video feature
export default function OatsLogo({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stalk */}
      <line x1="16" y1="28" x2="16" y2="10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Main grain head */}
      <ellipse cx="16" cy="7" rx="4.2" ry="6.5" fill="currentColor" opacity="0.95" />
      {/* Left leaf */}
      <path d="M16 17 C10 15 8 10 10 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Right leaf */}
      <path d="M16 20 C22 18 24 13 22 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* Grain lines on head */}
      <line x1="16" y1="3" x2="16" y2="12.5" stroke="white" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}
