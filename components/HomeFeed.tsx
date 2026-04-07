'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostComposer from './PostComposer'
import PostCard from './PostCard'
import type { Post, Profile } from '@/lib/types'

interface Props {
  profile: Profile
}

export default function HomeFeed({ profile }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'for-you' | 'following'>('for-you')
  const viewedPostIds = useRef<Set<string>>(new Set())

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('posts')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (tab === 'following') {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id)
      const ids = (follows || []).map((f: { following_id: string }) => f.following_id)
      if (ids.length === 0) { setPosts([]); setLoading(false); return }
      query = query.in('user_id', ids)
    }

    const { data: postsData } = await query

    // Fetch user interactions
    if (postsData && postsData.length > 0) {
      const postIds = postsData.map((p: Post) => p.id)
      const [{ data: likesData }, { data: repostsData }, { data: savesData }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', profile.id).in('post_id', postIds),
        supabase.from('reposts').select('post_id').eq('user_id', profile.id).in('post_id', postIds),
        supabase.from('saves').select('post_id').eq('user_id', profile.id).in('post_id', postIds),
      ])
      const likedSet = new Set((likesData || []).map((l: { post_id: string }) => l.post_id))
      const repostedSet = new Set((repostsData || []).map((r: { post_id: string }) => r.post_id))
      const savedSet = new Set((savesData || []).map((s: { post_id: string }) => s.post_id))

      setPosts(postsData.map((p: Post) => ({
        ...p,
        user_liked: likedSet.has(p.id),
        user_reposted: repostedSet.has(p.id),
        user_saved: savedSet.has(p.id),
      })))
    } else {
      setPosts([])
    }
    setLoading(false)
  }, [profile.id, tab])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPosts])

  // Simulation engine: ping every 12 seconds and after posts load
  useEffect(() => {
    const runSimulation = () => fetch('/api/simulate', { method: 'POST' })
    runSimulation()
    const interval = setInterval(runSimulation, 12_000)
    return () => clearInterval(interval)
  }, [])

  // IntersectionObserver: record a real view when a post scrolls into view
  useEffect(() => {
    if (posts.length === 0) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          const postId = (entry.target as HTMLElement).dataset.postId
          if (!postId || viewedPostIds.current.has(postId)) return
          viewedPostIds.current.add(postId)
          fetch(`/api/view/${postId}`, { method: 'POST' })
        })
      },
      { threshold: 0.6 }
    )
    document.querySelectorAll('[data-post-id]').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [posts])

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex">
          <button
            onClick={() => setTab('for-you')}
            className={`flex-1 py-4 text-sm font-bold transition hover:bg-foreground/5 relative ${
              tab === 'for-you' ? 'text-foreground' : 'text-foreground-secondary'
            }`}
          >
            For you
            {tab === 'for-you' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-4 text-sm font-bold transition hover:bg-foreground/5 relative ${
              tab === 'following' ? 'text-foreground' : 'text-foreground-secondary'
            }`}
          >
            Following
            {tab === 'following' && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </header>

      {/* Composer */}
      <PostComposer profile={profile} onPosted={fetchPosts} />

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center px-8">
          <p className="text-2xl font-black text-foreground">
            {tab === 'following' ? 'Follow people to see their posts' : 'No posts yet'}
          </p>
          <p className="text-foreground-secondary">
            {tab === 'following'
              ? 'When you follow accounts, their posts will show up here.'
              : 'Be the first to post something!'}
          </p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={profile.id}
            currentProfile={profile}
            onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
            onReplied={fetchPosts}
          />
        ))
      )}
    </div>
  )
}
