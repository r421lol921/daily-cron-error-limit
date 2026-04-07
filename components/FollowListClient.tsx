'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import VerifiedBadge from './VerifiedBadge'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface PersonWithFollow extends Profile {
  viewer_follows: boolean
}

interface Props {
  targetProfile: Profile
  people: PersonWithFollow[]
  currentUserId: string
  defaultTab: 'following' | 'followers'
}

export default function FollowListClient({ targetProfile, people, currentUserId, defaultTab }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'following' | 'followers'>(defaultTab)
  const [followStates, setFollowStates] = useState<Record<string, boolean>>(
    Object.fromEntries(people.map(p => [p.id, p.viewer_follows]))
  )

  async function toggleFollow(personId: string, e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (personId === currentUserId) return
    const supabase = createClient()
    const currently = followStates[personId]
    setFollowStates(s => ({ ...s, [personId]: !currently }))
    if (currently) {
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: personId })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: personId })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 py-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="font-bold text-xl text-foreground leading-tight">{targetProfile.display_name}</h2>
          <p className="text-foreground-secondary text-xs">@{targetProfile.username}</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border">
        <button
          onClick={() => { setTab('following'); router.push(`/profile/${targetProfile.username}/following`) }}
          className={`flex-1 py-4 text-sm font-bold transition hover:bg-foreground/5 relative ${
            tab === 'following' ? 'text-foreground' : 'text-foreground-secondary'
          }`}
        >
          Following
          {tab === 'following' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-primary rounded-full" />}
        </button>
        <button
          onClick={() => { setTab('followers'); router.push(`/profile/${targetProfile.username}/followers`) }}
          className={`flex-1 py-4 text-sm font-bold transition hover:bg-foreground/5 relative ${
            tab === 'followers' ? 'text-foreground' : 'text-foreground-secondary'
          }`}
        >
          Followers
          {tab === 'followers' && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-1 bg-primary rounded-full" />}
        </button>
      </nav>

      {/* List */}
      {people.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <p className="text-2xl font-black text-foreground">
            {tab === 'following' ? `@${targetProfile.username} isn&apos;t following anyone` : `@${targetProfile.username} has no followers yet`}
          </p>
          <p className="text-foreground-secondary text-sm">
            {tab === 'following'
              ? 'When they follow someone, they will appear here.'
              : 'When someone follows them, they will appear here.'}
          </p>
        </div>
      ) : (
        <div>
          {people.map(person => {
            const isFollowing = followStates[person.id]
            const isMe = person.id === currentUserId
            return (
              <Link
                key={person.id}
                href={`/profile/${person.username}`}
                className="flex items-start gap-3 px-4 py-4 border-b border-border hover:bg-foreground/[0.02] transition"
              >
                <Image
                  src={person.avatar_url || DEFAULT_AVATAR}
                  alt={person.display_name}
                  width={44}
                  height={44}
                  className="rounded-full w-11 h-11 object-cover flex-shrink-0"
                  unoptimized
                />
                <div className="flex flex-1 justify-between items-start min-w-0 gap-2">
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-foreground truncate">{person.display_name}</span>
                      {person.followers_count >= 199000 && <VerifiedBadge size={15} />}
                    </div>
                    <span className="text-foreground-secondary text-sm">@{person.username}</span>
                    {person.bio && (
                      <p className="text-foreground text-sm leading-relaxed mt-1 line-clamp-2">{person.bio}</p>
                    )}
                  </div>
                  {!isMe && (
                    <button
                      onClick={e => toggleFollow(person.id, e)}
                      className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                        isFollowing
                          ? 'border border-border text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                          : 'bg-foreground text-background hover:bg-foreground/90'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
