interface Props {
  className?: string
  size?: number
}

export default function VerifiedBadge({ className = '', size = 18 }: Props) {
  return (
    <img
      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_Verified_Badge.svg-Wy37zhYwJTTYVXDenxlSB2rXQwY8HZ.png"
      alt="Verified"
      width={size}
      height={size}
      className={`inline-block flex-shrink-0 ${className}`}
      aria-label="Verified account"
    />
  )
}
