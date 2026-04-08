import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/ProfileClient'

interface Props {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Check if current user follows this profile
  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .match({ follower_id: user.id, following_id: profile.id })
      .maybeSingle()
    isFollowing = !!followData
  }

  // Fetch posts
  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*)')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch user interactions if logged in
  let likedSet = new Set<string>()
  let repostedSet = new Set<string>()
  let savedSet = new Set<string>()
  if (user && posts && posts.length > 0) {
    const postIds = posts.map((p: { id: string }) => p.id)
    const [{ data: likesData }, { data: repostsData }, { data: savesData }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', postIds),
    ])
    likedSet = new Set((likesData || []).map((l: { post_id: string }) => l.post_id))
    repostedSet = new Set((repostsData || []).map((r: { post_id: string }) => r.post_id))
    savedSet = new Set((savesData || []).map((s: { post_id: string }) => s.post_id))
  }

  const postsWithMeta = (posts || []).map((p: typeof posts[0]) => ({
    ...p,
    user_liked: likedSet.has(p.id),
    user_reposted: repostedSet.has(p.id),
    user_saved: savedSet.has(p.id),
  }))

  return (
    <ProfileClient
      profile={profile}
      posts={postsWithMeta}
      currentUserId={user?.id || ''}
      isFollowing={isFollowing}
      isOwner={user?.id === profile.id}
    />
  )
}
