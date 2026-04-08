import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DiscoverClient from '@/components/DiscoverClient'

export const metadata = {
  title: 'Discover - PeytOtoria',
  description: 'Discover trending hashtags and top creators',
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

  // Fetch trending hashtags
  const { data: hashtags } = await supabase
    .from('hashtags')
    .select('*')
    .order('post_count', { ascending: false })
    .limit(10)

  // Fetch today's top creators (by views today)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { data: topCreators } = await supabase
    .from('profiles')
    .select('*')
    .order('followers_count', { ascending: false })
    .limit(10)

  return (
    <DiscoverClient
      profile={profile}
      hashtags={hashtags || []}
      topCreators={topCreators || []}
    />
  )
}
