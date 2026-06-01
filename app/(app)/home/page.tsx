import { createClient } from '@/lib/supabase/server'
import HomeFeed from '@/components/HomeFeed'
import { redirect } from 'next/navigation'
import type { OatPost } from '@/components/OatsPlayer'

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

  // Fetch oats for home feed — randomized, limited to 6
  const { data: oatsRaw } = await supabase
    .from('oats')
    .select('*, profiles!oats_user_id_fkey(*)')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(100)

  // Shuffle and limit to 6 for a randomized home feed
  const shuffled = [...(oatsRaw || [])].sort(() => Math.random() - 0.5).slice(0, 6)
  const oats: OatPost[] = shuffled as OatPost[]

  // Fetch user liked / saved flags
  let userLiked: string[] = []
  let userSaved: string[] = []
  const [likedRes, savedRes] = await Promise.all([
    supabase.from('oat_likes').select('oat_id').eq('user_id', user.id),
    supabase.from('oat_saves').select('oat_id').eq('user_id', user.id),
  ])
  userLiked = (likedRes.data || []).map((r: any) => r.oat_id)
  userSaved = (savedRes.data || []).map((r: any) => r.oat_id)

  const oatsWithFlags = oats.map(o => ({
    ...o,
    user_liked: userLiked.includes(o.id),
    user_saved: userSaved.includes(o.id),
  }))

  return <HomeFeed profile={profile} initialOats={oatsWithFlags} currentUserId={user.id} />
}
