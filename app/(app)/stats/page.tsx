import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StatsUnavailable from '@/components/StatsUnavailable'

export const metadata = { title: 'Stats | PeytOtoria' }

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return <StatsUnavailable />
}
