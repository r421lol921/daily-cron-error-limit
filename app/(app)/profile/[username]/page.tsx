import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/ProfileClient'

interface Props {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Check if current user follows and subscribes to this profile
  let isFollowing = false
  let isSubscribed = false
  if (user && user.id !== profile.id) {
    // follows table always exists; subscriptions may not exist until migration runs
    const followRes = await supabase
      .from('follows')
      .select('id')
      .match({ follower_id: user.id, following_id: profile.id })
      .maybeSingle()
    isFollowing = !!followRes.data

    const subRes = await supabase
      .from('subscriptions')
      .select('id')
      .match({ subscriber_id: user.id, target_id: profile.id })
      .maybeSingle()
      .then(r => r)
      .catch(() => ({ data: null }))
    isSubscribed = !!subRes.data
  }

  return (
    <ProfileClient
      profile={profile}
      posts={[]}
      currentUserId={user?.id || ''}
      isFollowing={isFollowing}
      isOwner={user?.id === profile.id}
      isSubscribed={isSubscribed}
    />
  )
}
