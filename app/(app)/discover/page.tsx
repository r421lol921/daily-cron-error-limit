import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiscoverClient from '@/components/DiscoverClient'

export const metadata = {
  title: 'Discover - PeytOtoria',
  description: 'Discover recommended posts and search PeytOtoria',
}

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch recommended posts: highest engagement (likes + reposts + saves), not from current user
  const { data: recommendedPosts } = await supabase
    .from('posts')
    .select('*, profiles!posts_user_id_fkey(*)')
    .neq('user_id', user.id)
    .eq('is_archived', false)
    .order('likes_count', { ascending: false })
    .limit(20)

  // Fetch user interactions for recommended posts
  let enriched = recommendedPosts || []
  if (enriched.length > 0) {
    const postIds = enriched.map((p: any) => p.id)
    const [{ data: likesData }, { data: repostsData }, { data: savesData }] = await Promise.all([
      supabase.from('likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('reposts').select('post_id').eq('user_id', user.id).in('post_id', postIds),
      supabase.from('saves').select('post_id').eq('user_id', user.id).in('post_id', postIds),
    ])
    const likedSet = new Set((likesData || []).map((l: any) => l.post_id))
    const repostedSet = new Set((repostsData || []).map((r: any) => r.post_id))
    const savedSet = new Set((savesData || []).map((s: any) => s.post_id))
    enriched = enriched.map((p: any) => ({
      ...p,
      user_liked: likedSet.has(p.id),
      user_reposted: repostedSet.has(p.id),
      user_saved: savedSet.has(p.id),
    }))
  }

  return (
    <DiscoverClient
      profile={profile}
      recommendedPosts={enriched}
      currentUserId={user.id}
    />
  )
}
