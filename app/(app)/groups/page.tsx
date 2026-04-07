import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GroupsClient from '@/components/GroupsClient'

export const metadata = { title: 'Groups | PeytOtoria' }

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  // All groups
  const { data: groups } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })

  // Groups the user owns
  const { data: ownedGroups } = await supabase
    .from('groups')
    .select('id')
    .eq('owner_id', user.id)

  // Groups the user is a member of
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  const ownedIds = new Set((ownedGroups || []).map((g: { id: string }) => g.id))
  const memberIds = new Set((memberRows || []).map((m: { group_id: string }) => m.group_id))

  return (
    <GroupsClient
      groups={groups || []}
      currentUserId={user.id}
      currentProfile={profile}
      ownedGroupIds={Array.from(ownedIds)}
      memberGroupIds={Array.from(memberIds)}
    />
  )
}
