import { createClient } from '@/lib/supabase/server'
import OatsClient from '@/components/OatsClient'
import type { OatPost } from '@/components/OatsPlayer'

export const metadata = { title: 'Clips | Faundry' }

export default async function ClipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch oats from the oats table — same as the /oats route
  const { data: oatsRaw } = await supabase
    .from('oats')
    .select('*, profiles!oats_user_id_fkey(*)')
    .eq('is_archived', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(100)

  // Shuffle for discovery feed
  const oats: OatPost[] = ([...(oatsRaw || [])].sort(() => Math.random() - 0.5)) as OatPost[]

  let userLiked: string[] = []
  let userSaved: string[] = []
  if (user) {
    const [likedRes, savedRes] = await Promise.all([
      supabase.from('oat_likes').select('oat_id').eq('user_id', user.id),
      supabase.from('oat_saves').select('oat_id').eq('user_id', user.id),
    ])
    userLiked = (likedRes.data || []).map((r: any) => r.oat_id)
    userSaved = (savedRes.data || []).map((r: any) => r.oat_id)
  }

  const oatsWithFlags = oats.map(o => ({
    ...o,
    user_liked: userLiked.includes(o.id),
    user_saved: userSaved.includes(o.id),
  }))

  return (
    <div className="flex flex-col h-screen bg-black overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center gap-2 px-4 pt-3 pb-2 pointer-events-none">
        <span className="text-white font-black text-xl tracking-tight">Clips</span>
      </div>
      <div className="flex-1 w-full">
        <OatsClient
          initialOats={oatsWithFlags}
          currentUserId={user?.id ?? null}
        />
      </div>
    </div>
  )
}
