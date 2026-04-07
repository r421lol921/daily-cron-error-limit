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
    .select('*, profiles(*)')
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
    .select('*, profiles(*)')
    .eq('post_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Record real view
  if (user) {
    await supabase
      .from('post_views')
      .upsert({ post_id: id, viewer_id: user.id }, { onConflict: 'post_id,viewer_id' })
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
    />
  )
}
