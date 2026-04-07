import { createClient } from '@/lib/supabase/server'
import ClipsClient from '@/components/ClipsClient'

export const metadata = { title: 'Clips | PeytOtoria' }

export default async function ClipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all posts that have video media
  const { data: posts } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .not('media_urls', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)

  // Filter to only video posts
  const videoPosts = (posts || []).filter(p =>
    p.media_urls?.some((url: string) => /\.(mp4|webm|ogg|mov)$/i.test(url))
  )

  // Get user interactions for the video posts
  let postIds = videoPosts.map(p => p.id)
  let likedSet = new Set<string>()
  let repostedSet = new Set<string>()
  let savedSet = new Set<string>()

  if (user && postIds.length > 0) {
    const [{ data: likes }, { data: reposts }, { data: saves }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', postIds),
    ])
    likedSet = new Set((likes || []).map((l: { post_id: string }) => l.post_id))
    repostedSet = new Set((reposts || []).map((r: { post_id: string }) => r.post_id))
    savedSet = new Set((saves || []).map((s: { post_id: string }) => s.post_id))
  }

  const videoPostsWithMeta = videoPosts.map(p => ({
    ...p,
    user_liked: likedSet.has(p.id),
    user_reposted: repostedSet.has(p.id),
    user_saved: savedSet.has(p.id),
  }))

  let currentProfile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    currentProfile = data
  }

  return <ClipsClient posts={videoPostsWithMeta} currentUserId={user?.id || ''} currentProfile={currentProfile} />
}
