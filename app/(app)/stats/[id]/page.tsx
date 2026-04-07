import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostStatsClient from '@/components/PostStatsClient'

export const metadata = { title: 'Post Stats | PeytOtoria' }

export default async function PostStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: post } = await supabase
    .from('posts')
    .select('*, profiles(*)')
    .eq('id', id)
    .single()

  if (!post) notFound()

  // Fetch likers
  const { data: likers } = await supabase
    .from('likes')
    .select('*, profiles(*)')
    .eq('post_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Fetch reposters
  const { data: reposters } = await supabase
    .from('reposts')
    .select('*, profiles(*)')
    .eq('post_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return <PostStatsClient post={post} likers={likers ?? []} reposters={reposters ?? []} currentUserId={user.id} />
}
