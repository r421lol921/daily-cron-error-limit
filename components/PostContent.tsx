'use client'

import Link from 'next/link'

interface Props {
  content: string
  className?: string
}

export default function PostContent({ content, className = '' }: Props) {
  const tokens = content.split(/(#\w+|@\w+)/g)

  return (
    <p className={`whitespace-pre-wrap break-words post-content ${className}`}>
      {tokens.map((token, i) => {
        if (token.startsWith('#')) {
          const tag = token.slice(1).toLowerCase()
          return (
            <Link
              key={i}
              href={`/discover?tag=${tag}`}
              onClick={e => e.stopPropagation()}
              className="text-primary hover:underline font-medium"
            >
              {token}
            </Link>
          )
        }
        if (token.startsWith('@')) {
          const username = token.slice(1)
          return (
            <Link
              key={i}
              href={`/profile/${username}`}
              onClick={e => e.stopPropagation()}
              className="text-primary hover:underline font-medium"
            >
              {token}
            </Link>
          )
        }
        return <span key={i}>{token}</span>
      })}
    </p>
  )
}
