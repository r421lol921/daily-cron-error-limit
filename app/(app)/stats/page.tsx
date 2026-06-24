import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatsClient from '@/components/StatsClient'

export const metadata = { title: 'Stats | Faundry.buzz' }

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)
    .order('views_count', { ascending: false })
    .limit(30)

  return <StatsClient profile={profile} posts={posts ?? []} />
}
