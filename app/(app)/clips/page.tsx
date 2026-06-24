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

  // Extract @mentions from captions to find collab profiles (max 1 per clip)
  const mentionUsernames = oats.map(o => {
    const match = o.caption?.match(/@([A-Za-z0-9_]+)/)
    return match ? match[1].toLowerCase() : null
  })
  const uniqueMentions = [...new Set(mentionUsernames.filter(Boolean))] as string[]
  let collabProfileMap: Record<string, any> = {}
  if (uniqueMentions.length > 0) {
    const { data: collabProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('username', uniqueMentions)
    if (collabProfiles) {
      collabProfileMap = Object.fromEntries(collabProfiles.map((p: any) => [p.username.toLowerCase(), p]))
    }
  }

  const oatsWithFlags = oats.map((o, idx) => ({
    ...o,
    user_liked: userLiked.includes(o.id),
    user_saved: userSaved.includes(o.id),
    collab_profile: mentionUsernames[idx] ? (collabProfileMap[mentionUsernames[idx]!] ?? null) : null,
  }))

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ height: '100dvh' }}>
      <OatsClient
        initialOats={oatsWithFlags}
        currentUserId={user?.id ?? null}
      />
    </div>
  )
}
