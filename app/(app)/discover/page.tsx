import { createClient } from '@/lib/supabase/server'
import DiscoverClient from '@/components/DiscoverClient'
import type { OatPost } from '@/components/OatsPlayer'

export const metadata = {
  title: 'Discover - Faundry.buzz',
  description: 'Discover Oats on Faundry.buzz',
}

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const profile = user
    ? (await supabase.from('profiles').select('*').eq('id', user.id).single()).data
    : null

  // Fetch random oats for discovery — non-expired only
  const { data: oatsRaw } = await supabase
    .from('oats')
    .select('*, profiles!oats_user_id_fkey(*)')
    .eq('is_archived', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(100)

  // Shuffle server-side for random discovery
  const shuffled = [...(oatsRaw || [])].sort(() => Math.random() - 0.5)

  // Enrich with user like/save flags
  let enriched = shuffled
  if (user && enriched.length > 0) {
    const ids = enriched.map((o: any) => o.id)
    const [{ data: likedData }, { data: savedData }] = await Promise.all([
      supabase.from('oat_likes').select('oat_id').eq('user_id', user.id).in('oat_id', ids),
      supabase.from('oat_saves').select('oat_id').eq('user_id', user.id).in('oat_id', ids),
    ])
    const likedSet = new Set((likedData || []).map((l: any) => l.oat_id))
    const savedSet = new Set((savedData || []).map((s: any) => s.oat_id))
    enriched = enriched.map((o: any) => ({
      ...o,
      user_liked: likedSet.has(o.id),
      user_saved: savedSet.has(o.id),
    }))
  }

  return (
    <DiscoverClient
      profile={profile}
      recommendedOats={enriched as OatPost[]}
      currentUserId={user?.id ?? null}
    />
  )
}
