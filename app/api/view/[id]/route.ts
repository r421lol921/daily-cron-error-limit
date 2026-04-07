import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ ok: false })

  // Check if this user already viewed
  const { data: existing } = await supabase
    .from('post_views')
    .select('id')
    .match({ post_id: id, viewer_id: user.id })
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: false, reason: 'already_viewed' })

  // Record view
  await supabase.from('post_views').insert({ post_id: id, viewer_id: user.id })

  // Fetch current post
  const { data: post } = await supabase.from('posts').select('real_views_count, is_archived').eq('id', id).single()
  if (!post) return NextResponse.json({ ok: false })

  const newRealViews = (post.real_views_count || 0) + 1
  const shouldArchive = newRealViews >= 8

  await supabase.from('posts').update({
    real_views_count: newRealViews,
    views_count: supabase.rpc ? undefined : undefined,
    is_archived: shouldArchive,
  }).eq('id', id)

  return NextResponse.json({ ok: true, archived: shouldArchive, real_views: newRealViews })
}
