import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PostDetailClient from '@/components/PostDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // Fetch user interactions
  let userLiked = false, userReposted = false, userSaved = false
  if (user) {
    const [{ data: likeData }, { data: repostData }, { data: saveData }] = await Promise.all([
      supabase.from('likes').select('id').match({ user_id: user.id, post_id: id }).maybeSingle(),
      supabase.from('reposts').select('id').match({ user_id: user.id, post_id: id }).maybeSingle(),
      supabase.from('saves').select('id').match({ user_id: user.id, post_id: id }).maybeSingle(),
    ])
    userLiked = !!likeData
    userReposted = !!repostData
    userSaved = !!saveData
  }

  // Fetch who liked
  const { data: likers } = await supabase
    .from('likes')
    .select('*, profiles!likes_user_id_fkey(*)')
    .eq('post_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch replies to this post
  const { data: replies } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*)')
    .eq('reply_to_id', id)
    .order('created_at', { ascending: true })

  // For each reply, fetch if current user liked/reposted/saved
  let repliesWithMeta = replies || []
  if (user && repliesWithMeta.length > 0) {
    const replyIds = repliesWithMeta.map(r => r.id)
    const [{ data: replyLikes }, { data: replyReposts }, { data: replySaves }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', replyIds),
      supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', replyIds),
      supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', replyIds),
    ])
    const likedSet = new Set((replyLikes || []).map((l: { post_id: string }) => l.post_id))
    const repostedSet = new Set((replyReposts || []).map((r: { post_id: string }) => r.post_id))
    const savedSet = new Set((replySaves || []).map((s: { post_id: string }) => s.post_id))
    repliesWithMeta = repliesWithMeta.map(r => ({
      ...r,
      user_liked: likedSet.has(r.id),
      user_reposted: repostedSet.has(r.id),
      user_saved: savedSet.has(r.id),
    }))
  }

  // Record real view
  if (user) {
    await supabase
      .from('post_views')
      .upsert({ post_id: id, viewer_id: user.id }, { onConflict: 'post_id,viewer_id' })
  }

  // Fetch current user profile
  let currentProfile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    currentProfile = data
  }

  // Fetch recommended posts (popular posts, not by same author, not this post)
  const { data: rawRecommended } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*)')
    .neq('id', id)
    .neq('user_id', post.user_id)
    .eq('is_archived', false)
    .order('likes_count', { ascending: false })
    .limit(10)

  let recommended = rawRecommended || []
  if (user && recommended.length > 0) {
    const recIds = recommended.map((p: any) => p.id)
    const [{ data: recLikes }, { data: recReposts }, { data: recSaves }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', recIds),
      supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', recIds),
      supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', recIds),
    ])
    const lSet = new Set((recLikes || []).map((l: any) => l.post_id))
    const rSet = new Set((recReposts || []).map((r: any) => r.post_id))
    const sSet = new Set((recSaves || []).map((s: any) => s.post_id))
    recommended = recommended.map((p: any) => ({
      ...p,
      user_liked: lSet.has(p.id),
      user_reposted: rSet.has(p.id),
      user_saved: sSet.has(p.id),
    }))
  }

  const postWithMeta = {
    ...post,
    user_liked: userLiked,
    user_reposted: userReposted,
    user_saved: userSaved,
  }

  return (
    <PostDetailClient
      post={postWithMeta}
      likers={likers || []}
      currentUserId={user?.id || ''}
      currentProfile={currentProfile ?? undefined}
      initialReplies={repliesWithMeta}
      recommendedPosts={recommended}
    />
  )
}
