import { createClient } from '@/lib/supabase/server'
import OatsClient from '@/components/OatsClient'
import type { OatPost } from '@/components/OatsPlayer'

export const metadata = {
  title: 'Oats',
  description: 'Short-form videos on Peyt',
}

export default async function OatsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch oats with profile data — non-expired only, random algorithm order
  const { data: oatsRaw } = await supabase
    .from('oats')
    .select('*, profiles!oats_user_id_fkey(*)')
    .eq('is_archived', false)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(100)

  // Shuffle for random feed algorithm
  const oats: OatPost[] = ([...(oatsRaw || [])].sort(() => Math.random() - 0.5)) as OatPost[]

  // Fetch user liked / saved flags
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
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 flex items-center gap-2 px-4 pt-3 pb-2 pointer-events-none">
        <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <span className="text-white font-black text-xl tracking-tight">Clips</span>
      </div>

      {/* Full-screen feed */}
      <div className="flex-1 w-full">
        <OatsClient
          initialOats={oatsWithFlags}
          currentUserId={user?.id ?? null}
        />
      </div>
    </div>
  )
}
