'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import VerifiedBadge from './VerifiedBadge'
import { formatFollowers } from '@/lib/format'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profiles: Profile[]
  currentUserId: string
  initialFollowing: string[]
}

export default function RecommendedProfiles({ profiles, currentUserId, initialFollowing }: Props) {
  const [following, setFollowing] = useState<Set<string>>(new Set(initialFollowing))

  if (profiles.length === 0) return null

  async function handleFollow(e: React.MouseEvent, targetId: string) {
    e.preventDefault()
    e.stopPropagation()
    const supabase = createClient()
    if (following.has(targetId)) {
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetId })
      setFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId })
      setFollowing(prev => new Set([...prev, targetId]))
    }
  }

  return (
    <section className="border-b border-border">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-bold text-foreground-secondary uppercase tracking-widest">Suggested for you</h2>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {profiles.map(p => (
          <Link
            key={p.id}
            href={`/profile/${p.username}`}
            className="flex-shrink-0 w-36 flex flex-col items-center gap-2 p-3 rounded-2xl border border-border bg-background-secondary hover:bg-foreground/5 transition group"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-border group-hover:ring-primary/40 transition">
                <Image
                  src={p.avatar_url || DEFAULT_AVATAR}
                  alt={p.display_name}
                  width={56}
                  height={56}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </div>
              {p.is_verified && (
                <span className="absolute -bottom-0.5 -right-0.5">
                  <VerifiedBadge size={16} />
                </span>
              )}
            </div>

            {/* Name */}
            <div className="text-center min-w-0 w-full">
              <p className="font-bold text-xs text-foreground truncate">{p.display_name}</p>
              <p className="text-foreground-secondary text-[11px] truncate">@{p.username}</p>
              {p.followers_count > 0 && (
                <p className="text-foreground-secondary text-[10px] mt-0.5">{formatFollowers(p.followers_count)} followers</p>
              )}
            </div>

            {/* Follow button */}
            <button
              onClick={e => handleFollow(e, p.id)}
              className={`w-full text-xs font-bold py-1.5 rounded-full transition ${
                following.has(p.id)
                  ? 'border border-border text-foreground hover:border-destructive hover:text-destructive'
                  : 'bg-foreground text-background hover:bg-foreground/85'
              }`}
            >
              {following.has(p.id) ? 'Following' : 'Follow'}
            </button>
          </Link>
        ))}
      </div>
    </section>
  )
}
