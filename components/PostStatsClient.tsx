'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCount, formatFullDate } from '@/lib/format'
import PostContent from './PostContent'
import VerifiedBadge from './VerifiedBadge'
import type { Post, Like } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Repost {
  id: string
  user_id: string
  post_id: string
  created_at: string
  profiles?: {
    username: string
    display_name: string
    avatar_url: string | null
    followers_count: number
  } | null
}

interface Props {
  post: Post
  likers: Like[]
  reposters: Repost[]
  currentUserId: string
}

export default function PostStatsClient({ post, likers, reposters, currentUserId }: Props) {
  const router = useRouter()
  const profile = post.profiles!
  const mediaUrls = post.media_urls?.filter(Boolean) ?? []

  const engagementRate = post.views_count > 0
    ? ((post.likes_count + post.reposts_count + post.saves_count) / post.views_count * 100).toFixed(1)
    : '0.0'

  const statRows = [
    { label: 'Views', value: post.views_count, sub: `${post.real_views_count} real`, color: 'text-foreground' },
    { label: 'Likes', value: post.likes_count, color: 'text-foreground' },
    { label: 'Reposts', value: post.reposts_count, color: 'text-foreground' },
    { label: 'Saves', value: post.saves_count, color: 'text-foreground' },
    { label: 'Engagement', value: `${engagementRate}%`, color: 'text-foreground' },
  ]

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 py-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-foreground">Post Stats</h2>
      </header>

      {/* Post preview */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex gap-3">
          <Link href={`/profile/${profile.username}`}>
            <Image
              src={profile.avatar_url || DEFAULT_AVATAR}
              alt={profile.display_name}
              width={44}
              height={44}
              className="rounded-full w-11 h-11 object-cover"
              unoptimized
            />
          </Link>
          <div className="flex flex-col flex-1 min-w-0">
            <Link href={`/profile/${profile.username}`} className="flex items-center gap-1 hover:underline">
              <span className="font-bold text-foreground text-sm">{profile.display_name}</span>
              {profile.followers_count >= 199000 && <VerifiedBadge size={14} />}
            </Link>
            <span className="text-foreground-secondary text-xs">@{profile.username}</span>
            <PostContent content={post.content} className="text-foreground text-[15px] leading-relaxed mt-1" />
            {mediaUrls.length > 0 && (
              <div className="mt-2 flex gap-1.5">
                {mediaUrls.slice(0, 3).map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                    {/\.(mp4|webm|ogg|mov)$/i.test(url) ? (
                      <video src={url} className="w-full h-full object-cover" muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-foreground-secondary text-xs mt-2">{formatFullDate(post.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="p-4 border-b border-border">
        <h3 className="font-bold text-foreground mb-3">Performance</h3>
        <div className="grid grid-cols-2 gap-3">
          {statRows.map(row => (
            <div key={row.label} className="bg-background-secondary border border-border rounded-2xl p-4">
              <p className="text-foreground-secondary text-sm mb-1">{row.label}</p>
              <p className={`text-2xl font-black ${row.color} tabular-nums`}>
                {typeof row.value === 'number' ? formatCount(row.value) : row.value}
              </p>
              {row.sub && <p className="text-foreground-secondary text-xs mt-0.5">{row.sub}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Likers */}
      {likers.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-bold text-foreground">
              Liked by
              <span className="ml-2 text-foreground-secondary font-normal text-sm">({likers.length})</span>
            </h3>
          </div>
          {likers.map(liker => (
            <Link
              key={liker.id}
              href={`/profile/${liker.profiles?.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition"
            >
              <Image
                src={liker.profiles?.avatar_url || DEFAULT_AVATAR}
                alt={liker.profiles?.display_name || 'User'}
                width={36}
                height={36}
                className="rounded-full w-9 h-9 object-cover flex-shrink-0"
                unoptimized
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-foreground truncate">{liker.profiles?.display_name}</span>
                  {(liker.profiles?.followers_count ?? 0) >= 199000 && <VerifiedBadge size={13} />}
                </div>
                <p className="text-foreground-secondary text-xs">@{liker.profiles?.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Reposters */}
      {reposters.length > 0 && (
        <div className="border-b border-border">
          <div className="px-4 pt-4 pb-2">
            <h3 className="font-bold text-foreground">
              Reposted by
              <span className="ml-2 text-foreground-secondary font-normal text-sm">({reposters.length})</span>
            </h3>
          </div>
          {reposters.map(reposter => (
            <Link
              key={reposter.id}
              href={`/profile/${reposter.profiles?.username}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition"
            >
              <Image
                src={reposter.profiles?.avatar_url || DEFAULT_AVATAR}
                alt={reposter.profiles?.display_name || 'User'}
                width={36}
                height={36}
                className="rounded-full w-9 h-9 object-cover flex-shrink-0"
                unoptimized
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-foreground truncate">{reposter.profiles?.display_name}</span>
                  {(reposter.profiles?.followers_count ?? 0) >= 199000 && <VerifiedBadge size={13} />}
                </div>
                <p className="text-foreground-secondary text-xs">@{reposter.profiles?.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
