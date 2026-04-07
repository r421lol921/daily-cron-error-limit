'use client'

import { useRouter } from 'next/navigation'

interface Props {
  content: string
  className?: string
}

export default function PostContent({ content, className = '' }: Props) {
  const router = useRouter()

  // Split content into tokens: hashtags, mentions, and plain text
  const tokens = content.split(/(#\w+|@\w+)/g)

  return (
    <p className={`whitespace-pre-wrap break-words post-content ${className}`}>
      {tokens.map((token, i) => {
        if (token.startsWith('#')) {
          const tag = token.slice(1)
          return (
            <span
              key={i}
              className="hashtag text-primary cursor-pointer hover:underline"
              onClick={e => { e.stopPropagation(); router.push(`/home?tag=${tag}`) }}
            >
              {token}
            </span>
          )
        }
        if (token.startsWith('@')) {
          const user = token.slice(1)
          return (
            <span
              key={i}
              className="mention text-primary cursor-pointer hover:underline"
              onClick={e => { e.stopPropagation(); router.push(`/profile/${user}`) }}
            >
              {token}
            </span>
          )
        }
        return <span key={i}>{token}</span>
      })}
    </p>
  )
}
