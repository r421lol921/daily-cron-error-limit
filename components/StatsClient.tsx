'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCount, formatDate } from '@/lib/format'
import type { Post, Profile } from '@/lib/types'

interface Props {
  profile: Profile
  posts: Post[]
}

export default function StatsClient({ profile, posts }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'overview' | 'posts'>('overview')

  const totalViews = posts.reduce((s, p) => s + (p.views_count || 0), 0)
  const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0)
  const totalReposts = posts.reduce((s, p) => s + (p.reposts_count || 0), 0)
  const totalSaves = posts.reduce((s, p) => s + (p.saves_count || 0), 0)
  const totalRealViews = posts.reduce((s, p) => s + (p.real_views_count || 0), 0)
  const avgEngagement = posts.length > 0
    ? Math.round(((totalLikes + totalReposts + totalSaves) / Math.max(totalViews, 1)) * 100 * 10) / 10
    : 0

  const topPosts = [...posts].sort((a, b) => b.views_count - a.views_count).slice(0, 10)

  const statCards = [
    { label: 'Total Views', value: totalViews, icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )},
    { label: 'Real Views', value: totalRealViews, icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    )},
    { label: 'Total Likes', value: totalLikes, icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    )},
    { label: 'Reposts', value: totalReposts, icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
      </svg>
    )},
    { label: 'Saves', value: totalSaves, icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
      </svg>
    )},
    { label: 'Engagement Rate', value: `${avgEngagement}%`, icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    )},
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
        <div>
          <h2 className="font-bold text-xl text-foreground leading-tight">Stats</h2>
          <p className="text-foreground-secondary text-xs">@{profile.username}</p>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border">
        {(['overview', 'posts'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-sm font-bold capitalize transition hover:bg-foreground/5 relative ${
              tab === t ? 'text-foreground' : 'text-foreground-secondary'
            }`}
          >
            {t === 'overview' ? 'Overview' : 'Top Posts'}
            {tab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="p-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {statCards.map(card => (
              <div key={card.label} className="bg-background-secondary border border-border rounded-2xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-foreground-secondary text-sm">{card.label}</span>
                  <span className="text-foreground-secondary">{card.icon}</span>
                </div>
                <span className="text-3xl font-black text-foreground tabular-nums">
                  {typeof card.value === 'number' ? formatCount(card.value) : card.value}
                </span>
              </div>
            ))}
          </div>

          {/* Account overview */}
          <div className="bg-background-secondary border border-border rounded-2xl p-4 mb-4">
            <h3 className="font-bold text-foreground mb-3">Account</h3>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary text-sm">Followers</span>
                <span className="font-bold text-foreground">{formatCount(profile.followers_count)}</span>
              </div>
              <div className="w-full h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary text-sm">Following</span>
                <span className="font-bold text-foreground">{formatCount(profile.following_count)}</span>
              </div>
              <div className="w-full h-px bg-border" />
              <div className="flex justify-between items-center">
                <span className="text-foreground-secondary text-sm">Total Posts</span>
                <span className="font-bold text-foreground">{formatCount(profile.posts_count)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'posts' && (
        <div>
          {topPosts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
              <svg viewBox="0 0 24 24" className="w-16 h-16 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              <p className="text-2xl font-black text-foreground">No posts yet</p>
              <p className="text-foreground-secondary text-sm">Post something to see your stats here.</p>
            </div>
          ) : (
            <div>
              {topPosts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/stats/${post.id}`}
                  className="flex gap-4 px-4 py-4 border-b border-border hover:bg-foreground/[0.02] transition"
                >
                  <div className="flex items-center justify-center w-8 flex-shrink-0">
                    <span className="text-foreground-secondary font-bold text-lg">#{i + 1}</span>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 gap-1">
                    <p className="text-foreground text-sm leading-relaxed line-clamp-2">{post.content.trim() || '(media post)'}</p>
                    <p className="text-foreground-secondary text-xs">{formatDate(post.created_at)}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {formatCount(post.views_count)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                        </svg>
                        {formatCount(post.likes_count)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                        </svg>
                        {formatCount(post.reposts_count)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center text-foreground-secondary">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
