import { createClient } from '@/lib/supabase/server'
import HomeFeed from '@/components/HomeFeed'
import { redirect } from 'next/navigation'
import type { OatPost } from '@/components/OatsPlayer'
import type { Profile } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  // Fetch all data in parallel
  const [oatsRes, likedRes, savedRes, suggestRes, followingRes] = await Promise.all([
    supabase
      .from('oats')
      .select('*, profiles!oats_user_id_fkey(*)')
      .eq('is_archived', false)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('oat_likes').select('oat_id').eq('user_id', user.id),
    supabase.from('oat_saves').select('oat_id').eq('user_id', user.id),
    // Recommended profiles: most followed, excluding self
    supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('followers_count', { ascending: false })
      .limit(10),
    // Who the current user already follows
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id),
  ])

  // Shuffle oats and limit to 6
  const shuffled = [...(oatsRes.data || [])].sort(() => Math.random() - 0.5).slice(0, 6)
  const oats: OatPost[] = shuffled as OatPost[]

  const userLiked = (likedRes.data || []).map((r: any) => r.oat_id)
  const userSaved = (savedRes.data || []).map((r: any) => r.oat_id)

  const oatsWithFlags = oats.map(o => ({
    ...o,
    user_liked: userLiked.includes(o.id),
    user_saved: userSaved.includes(o.id),
  }))

  const recommendedProfiles: Profile[] = (suggestRes.data || []) as Profile[]
  const alreadyFollowing: string[] = (followingRes.data || []).map((f: any) => f.following_id)

  return (
    <HomeFeed
      profile={profile}
      initialOats={oatsWithFlags}
      currentUserId={user.id}
      recommendedProfiles={recommendedProfiles}
      initialFollowing={alreadyFollowing}
    />
  )
}
