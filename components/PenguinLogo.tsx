import Image from 'next/image'
import { cn } from '@/lib/utils'

const PENGUIN_URL = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/linux-penguin-sketched-logo-outline-2Nrhx0fwu1UwusfWDffvzLdaZVrVLy.png'

interface Props {
  className?: string
  size?: number
}

export default function PenguinLogo({ className, size = 32 }: Props) {
  return (
    <Image
      src={PENGUIN_URL}
      alt="Faundry.buzz penguin logo"
      width={size}
      height={size}
      className={cn('object-contain dark:invert', className)}
      unoptimized
    />
  )
}
