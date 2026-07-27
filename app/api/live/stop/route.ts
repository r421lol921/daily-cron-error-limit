import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { stream_id } = body

  if (!stream_id) return NextResponse.json({ error: 'stream_id required' }, { status: 400 })

  // Fetch the stream (must belong to this user)
  const { data: stream } = await supabase
    .from('live_streams')
    .select('id, started_at, is_live')
    .eq('id', stream_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!stream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })

  const now = new Date()
  const startedAt = new Date(stream.started_at)
  const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime())
  const elapsedMinutes = Math.ceil(elapsedMs / (1000 * 60))

  // Update daily usage — increment by elapsed minutes (cap at 10 total)
  const today = now.toISOString().split('T')[0]
  const { data: usageRow } = await supabase
    .from('live_daily_usage')
    .select('minutes_used')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .maybeSingle()

  const prevMinutes = usageRow?.minutes_used ?? 0
  const newMinutes = Math.min(10, prevMinutes + elapsedMinutes)

  await supabase.from('live_daily_usage').upsert(
    { user_id: user.id, usage_date: today, minutes_used: newMinutes },
    { onConflict: 'user_id,usage_date' }
  )

  // Mark stream ended
  await supabase
    .from('live_streams')
    .update({ is_live: false, ended_at: now.toISOString() })
    .eq('id', stream_id)

  return NextResponse.json({ ok: true, elapsedMinutes, totalMinutesToday: newMinutes })
}
