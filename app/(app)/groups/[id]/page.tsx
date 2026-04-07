import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GroupDetailClient from '@/components/GroupDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function GroupDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: group } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single()

  if (!group) notFound()

  const { data: members } = await supabase
    .from('group_members')
    .select('*, profiles(*)')
    .eq('group_id', id)
    .order('joined_at', { ascending: true })
    .limit(50)

  let isMember = false
  let isOwner = false
  let currentProfile = null

  if (user) {
    const [{ data: profile }, { data: memberRow }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('group_members').select('id').match({ group_id: id, user_id: user.id }).maybeSingle(),
    ])
    currentProfile = profile
    isMember = !!memberRow
    isOwner = group.owner_id === user.id
  }

  return (
    <GroupDetailClient
      group={group}
      members={members ?? []}
      currentUserId={user?.id ?? ''}
      currentProfile={currentProfile}
      initialIsMember={isMember}
      isOwner={isOwner}
    />
  )
}
