'use client'

import { useState, useEffect } from 'react'
import PostCard from './PostCard'
import LiveCard from './LiveCard'
import LiveViewerModal from './LiveViewerModal'
import { createClient } from '@/lib/supabase/client'
import type { Post, Profile, LiveStream } from '@/lib/types'

type Filter = 'all' | 'following' | 'subscribed' | 'live'

interface Props {
  posts: Post[]
  currentUserId: string
  currentProfile: Profile | null
}

export default function ClipsClient({ posts: initialPosts, currentUserId, currentProfile }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const [filtered, setFiltered] = useState<Post[]>(initialPosts)
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([])
  const [activeLive, setActiveLive] = useState<LiveStream | null>(null)
  const [loading, setLoading] = useState(false)

  // Load filter-specific data from Supabase
  useEffect(() => {
    if (filter === 'all') {
      setFiltered(initialPosts)
      return
    }

    const run = async () => {
      setLoading(true)
      const supabase = createClient()
      const now = new Date().toISOString()

      if (filter === 'live') {
        const { data } = await supabase
          .from('live_streams')
          .select('*, profiles!live_streams_user_id_fkey(*)')
          .eq('is_live', true)
          .order('viewer_count', { ascending: false })
          .limit(30)
        setLiveStreams((data || []) as LiveStream[])
        setLoading(false)
        return
      }

      if (!currentUserId) { setFiltered([]); setLoading(false); return }

      // Get the IDs of users this person follows / subscribes to
      let userIds: string[] = []
      if (filter === 'following') {
        const { data } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
        userIds = (data || []).map((r: any) => r.following_id)
      } else if (filter === 'subscribed') {
        const { data } = await supabase
          .from('subscriptions')
          .select('target_id')
          .eq('subscriber_id', currentUserId)
        userIds = (data || []).map((r: any) => r.target_id)
      }

      if (userIds.length === 0) { setFiltered([]); setLoading(false); return }

      const { data: posts } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .in('user_id', userIds)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(100)

      // Only keep posts that have video media
      const videoPosts = ((posts as Post[]) || []).filter(p =>
        (p.media_urls || []).some(url =>
          /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video')
        )
      )
      setFiltered(videoPosts)
      setLoading(false)
    }

    run()
  }, [filter, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',        label: 'All' },
    { key: 'following',  label: 'Following' },
    { key: 'subscribed', label: 'Subscribed' },
    { key: 'live',       label: 'Live' },
  ]

  return (
    <div className="min-h-screen">
      {/* Live viewer modal */}
      {activeLive && (
        <LiveViewerModal
          stream={activeLive}
          currentUserId={currentUserId}
          onClose={() => setActiveLive(null)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h1 className="font-bold text-xl text-foreground">Clips</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex overflow-x-auto scrollbar-none px-4 pb-0 gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition mb-2 ${
                filter === key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-foreground-secondary border-border hover:bg-foreground/10'
              }`}
            >
              {key === 'live' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              )}
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Live grid */}
      {!loading && filter === 'live' && (
        liveStreams.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 px-8 text-center">
            <span className="w-4 h-4 rounded-full bg-red-500/30 flex items-center justify-center mx-auto mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
            </span>
            <p className="text-2xl font-black text-foreground">No one is live</p>
            <p className="text-foreground-secondary text-sm">Check back soon or start your own stream.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {liveStreams.map(stream => (
              <LiveCard
                key={stream.id}
                stream={stream}
                onClick={() => setActiveLive(stream)}
              />
            ))}
          </div>
        )
      )}

      {/* Clips list */}
      {!loading && filter !== 'live' && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-2xl font-black text-foreground">
              {filter === 'all' ? 'No clips yet' : filter === 'following' ? 'No clips from people you follow' : 'No clips from subscriptions'}
            </p>
            <p className="text-foreground-secondary text-sm">
              {filter === 'all' ? 'Posts with videos will appear here.' : 'Follow or subscribe to creators to see their clips here.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                currentProfile={currentProfile ?? undefined}
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
