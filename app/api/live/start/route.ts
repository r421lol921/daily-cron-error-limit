import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { title, category } = body

  // Check if user already has an active stream
  const { data: existingStream } = await supabase
    .from('live_streams')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_live', true)
    .maybeSingle()

  if (existingStream) {
    return NextResponse.json({ error: 'Already streaming' }, { status: 409 })
  }

  // Check daily usage (previous streams today)
  const today = new Date().toISOString().split('T')[0]
  const { data: usageRow } = await supabase
    .from('live_daily_usage')
    .select('minutes_used')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .maybeSingle()

  const minutesUsedToday = usageRow?.minutes_used ?? 0
  if (minutesUsedToday >= 10) {
    return NextResponse.json({ error: 'Daily 10-minute limit reached', minutesUsed: minutesUsedToday }, { status: 403 })
  }

  const minutesRemaining = 10 - minutesUsedToday
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()

  const { data: stream, error } = await supabase
    .from('live_streams')
    .insert({
      user_id: user.id,
      title: (title as string)?.trim() || 'Live Stream',
      category: (category as string)?.trim() || 'Just Chatting',
      viewer_count: 0,
      peak_viewer_count: 0,
      is_live: true,
      quality: '720p',
      expires_at: expiresAt,
    })
    .select('*, profiles!live_streams_user_id_fkey(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ stream, minutesRemaining })
}
