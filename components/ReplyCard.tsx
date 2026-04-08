'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import PostContent from './PostContent'
import FormattedOdometer from './FormattedOdometer'
import type { Post, Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  post: Post
  currentUserId: string
  currentProfile?: Profile
  showLine?: boolean
}

export default function ReplyCard({ post, currentUserId, currentProfile, showLine = false }: Props) {
  const router = useRouter()
  const [liked, setLiked] = useState(post.user_liked ?? false)
  const [likes, setLikes] = useState(post.likes_count)

  const profile = post.profiles

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    const supabase = createClient()
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: currentUserId, post_id: post.id })
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id })
      setLiked(true)
      setLikes(l => l + 1)
    }
  }

  function handleCardClick() {
    router.push(`/post/${post.id}`)
  }

  if (!profile) return null

  return (
    <article
      onClick={handleCardClick}
      className="relative flex gap-3 px-4 py-3 border-b border-border hover:bg-foreground/[0.02] transition cursor-pointer"
    >
      {/* Thread line */}
      {showLine && (
        <div className="absolute left-[38px] top-0 bottom-0 w-0.5 bg-border" />
      )}

      {/* Avatar */}
      <Link href={`/profile/${profile.username}`} onClick={e => e.stopPropagation()} className="flex-shrink-0 z-10">
        <Image
          src={profile.avatar_url || DEFAULT_AVATAR}
          alt={profile.display_name}
          width={48}
          height={48}
          className="rounded-full w-12 h-12 object-cover ring-4 ring-background"
          unoptimized
        />
      </Link>

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1 flex-wrap">
          <Link
            href={`/profile/${profile.username}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 hover:underline min-w-0"
          >
            <span className="font-bold text-foreground truncate text-sm">{profile.display_name}</span>
            {profile.followers_count >= 1000 && <VerifiedBadge size={14} />}
          </Link>
          <Link href={`/profile/${profile.username}`} onClick={e => e.stopPropagation()} className="text-foreground-secondary text-xs truncate">
            @{profile.username}
          </Link>
          <span className="text-foreground-secondary text-xs">·</span>
          <span className="text-foreground-secondary text-xs">{formatDate(post.created_at)}</span>
        </div>

        {/* Content */}
        <PostContent content={post.content} className="mt-1 text-foreground text-sm leading-normal" />

        {/* Actions */}
        <div className="flex items-center gap-12 mt-3 text-foreground-secondary">
          {/* Like */}
          <button
            onClick={handleLike}
            className={`group relative flex items-center gap-2 hover:text-pink-500 transition ${liked ? 'text-pink-500' : ''}`}
          >
            <span className="p-1.5 rounded-full group-hover:bg-pink-500/10 transition">
              <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </span>
            {likes > 0 && <FormattedOdometer value={likes} className="text-xs" />}
          </button>
        </div>
      </div>
    </article>
  )
}
