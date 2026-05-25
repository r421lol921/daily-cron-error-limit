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

  // Check if current user follows this profile
  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .match({ follower_id: user.id, following_id: profile.id })
      .maybeSingle()
    isFollowing = !!followData
  }

  return (
    <ProfileClient
      profile={profile}
      posts={[]}
      currentUserId={user?.id || ''}
      isFollowing={isFollowing}
      isOwner={user?.id === profile.id}
    />
  )
}
