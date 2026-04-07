import { createClient } from '@/lib/supabase/server'
import HomeFeed from '@/components/HomeFeed'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return <HomeFeed profile={profile} />
}
