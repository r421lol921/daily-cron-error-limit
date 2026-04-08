'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import PostComposer from './PostComposer'
import PostCard from './PostCard'
import PostSkeleton from './PostSkeleton'
import type { Post, Profile } from '@/lib/types'

const POSTS_PER_PAGE = 6

interface Props {
  profile: Profile | null
}

export default function HomeFeed({ profile }: Props) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'for-you' | 'following'>('for-you')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const viewedPostIds = useRef<Set<string>>(new Set())

  const fetchPosts = useCallback(async (pageNum: number = 1) => {
    if (pageNum === 1) {
      setLoading(true)
      setPosts([])
      setPage(1)
    } else {
      setLoadingMore(true)
    }
    
    const supabase = createClient()

    let query = supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(*)')
      .order('created_at', { ascending: false })
      .range((pageNum - 1) * POSTS_PER_PAGE, pageNum * POSTS_PER_PAGE - 1)

    if (tab === 'following') {
      if (!profile?.id) { 
        console.log('[v0] Following tab: No profile ID')
        setPosts([])
        setLoading(false)
        setHasMore(false)
        return
      }
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', profile.id)
      console.log('[v0] Following tab: follows =', follows)
      const ids = (follows || []).map((f: { following_id: string }) => f.following_id)
      console.log('[v0] Following tab: following_ids =', ids)
      if (ids.length === 0) { 
        console.log('[v0] Following tab: No follows found, showing empty')
        setPosts([])
        setLoading(false)
        setHasMore(false)
        return
      }
      query = query.in('user_id', ids)
    }

    const { data: postsData } = await query
    
    setHasMore((postsData || []).length === POSTS_PER_PAGE)

    // Fetch user interactions only if logged in
    if (postsData && postsData.length > 0 && profile?.id) {
      const postIds = postsData.map((p: Post) => p.id)
      const [{ data: likesData }, { data: repostsData }, { data: savesData }] = await Promise.all([
        supabase.from('likes').select('post_id').eq('user_id', profile.id).in('post_id', postIds),
        supabase.from('reposts').select('post_id').eq('user_id', profile.id).in('post_id', postIds),
        supabase.from('saves').select('post_id').eq('user_id', profile.id).in('post_id', postIds),
      ])
      const likedSet = new Set((likesData || []).map((l: { post_id: string }) => l.post_id))
      const repostedSet = new Set((repostsData || []).map((r: { post_id: string }) => r.post_id))
      const savedSet = new Set((savesData || []).map((s: { post_id: string }) => s.post_id))

      const enrichedPosts = postsData.map((p: Post) => ({
        ...p,
        user_liked: likedSet.has(p.id),
        user_reposted: repostedSet.has(p.id),
        user_saved: savedSet.has(p.id),
      }))
      
      if (pageNum === 1) {
        setPosts(enrichedPosts)
      } else {
        setPosts(prev => [...prev, ...enrichedPosts])
      }
    } else {
      if (pageNum === 1) {
        setPosts(postsData ?? [])
      } else {
        setPosts(prev => [...prev, ...(postsData ?? [])])
      }
    }
    setLoading(false)
    setLoadingMore(false)
  }, [profile?.id, tab])

  useEffect(() => { 
    fetchPosts(1)
    setPage(1)
    setHasMore(true)
  }, [tab, profile?.id])

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts(1)
        setPage(1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tab, profile?.id])

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
        <>
          {Array.from({ length: 6 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </>
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
        <>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={profile?.id ?? ''}
              currentProfile={profile ?? undefined}
              onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
              onReplied={() => { fetchPosts(1); setPage(1); }}
            />
          ))}
          
          {/* View More button */}
          {hasMore && (
            <div className="flex justify-center py-6 border-b border-border">
              <button
                onClick={() => {
                  const nextPage = page + 1
                  setPage(nextPage)
                  fetchPosts(nextPage)
                }}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-bold transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50"
              >
                {loadingMore ? 'Loading...' : 'View More'}
              </button>
            </div>
          )}
          
          {/* Loading more skeleton */}
          {loadingMore && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <PostSkeleton key={`loading-${i}`} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
