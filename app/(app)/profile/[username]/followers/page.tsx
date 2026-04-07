import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FollowListClient from '@/components/FollowListClient'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return { title: `${username}'s followers | PeytOtoria` }
}

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('username', username).single()
  if (!profile) notFound()

  // People who follow this profile
  const { data: followerRows } = await supabase
    .from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(*)')
    .eq('following_id', profile.id)
    .order('created_at', { ascending: false })

  const followerProfiles = (followerRows || []).map((r: any) => r.profiles).filter(Boolean)

  // Check which ones the current user follows
  const ids = followerProfiles.map((p: any) => p.id)
  let currentUserFollows: Set<string> = new Set()
  if (ids.length > 0) {
    const { data: myFollows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', ids)
    currentUserFollows = new Set((myFollows || []).map((f: any) => f.following_id))
  }

  const peopleWithFollow = followerProfiles.map((p: any) => ({
    ...p,
    viewer_follows: currentUserFollows.has(p.id),
  }))

  return (
    <FollowListClient
      targetProfile={profile}
      people={peopleWithFollow}
      currentUserId={user.id}
      defaultTab="followers"
    />
  )
}
