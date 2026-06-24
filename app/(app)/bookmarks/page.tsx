import { createClient } from '@/lib/supabase/server'
import BookmarksClient from '@/components/BookmarksClient'

export default async function BookmarksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: saves } = await supabase
    .from('saves')
    .select('*, posts(*, profiles!posts_user_id_fkey(*))')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const nowIso = new Date().toISOString()
  const posts = (saves || [])
    .map((s: { posts: unknown }) => s.posts)
    .filter((p: any) => p && (!p.expires_at || p.expires_at > nowIso))

  // Fetch interaction state
  const postIds = (posts as Array<{ id: string }>).map(p => p.id)
  let likedSet = new Set<string>(), repostedSet = new Set<string>()
  if (postIds.length > 0) {
    const [{ data: likesData }, { data: repostsData }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user!.id).in('post_id', postIds),
      supabase.from('reposts').select('post_id').eq('user_id', user!.id).in('post_id', postIds),
    ])
    likedSet = new Set((likesData || []).map((l: { post_id: string }) => l.post_id))
    repostedSet = new Set((repostsData || []).map((r: { post_id: string }) => r.post_id))
  }

  const postsWithMeta = (posts as Array<{ id: string } & Record<string, unknown>>).map(p => ({
    ...p,
    user_liked: likedSet.has(p.id),
    user_reposted: repostedSet.has(p.id),
    user_saved: true,
  }))

  return <BookmarksClient posts={postsWithMeta as import('@/lib/types').Post[]} currentUserId={user!.id} />
}
