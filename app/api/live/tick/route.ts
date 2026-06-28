import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Quality degrades over elapsed time to save bandwidth
function calcQuality(elapsedMinutes: number): string {
  if (elapsedMinutes >= 7) return '360p'
  if (elapsedMinutes >= 3) return '480p'
  return '720p'
}

// Realistic live viewer count.
// 1.1M followers → ~1,421 at start, builds to ~4,205 over 5 minutes with ±8% fluctuation.
function calcLiveViewers(followers: number, elapsedMinutes: number): number {
  const initial = Math.round(followers * 0.00129) // e.g. 1.1M → 1,419
  const peak    = Math.round(followers * 0.00382) // e.g. 1.1M → 4,202
  const rampFactor = Math.min(1, elapsedMinutes / 5)
  const target = initial + (peak - initial) * rampFactor
  const jitter = 0.92 + Math.random() * 0.16 // ±8%
  return Math.max(0, Math.round(target * jitter))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { stream_id } = body
  if (!stream_id) return NextResponse.json({ error: 'stream_id required' }, { status: 400 })

  // Fetch the active stream with broadcaster's follower count
  const { data: stream } = await supabase
    .from('live_streams')
    .select('*, profiles!live_streams_user_id_fkey(followers_count)')
    .eq('id', stream_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!stream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })
  if (!stream.is_live) return NextResponse.json({ forceStopped: true, reason: 'already_ended' })

  const now = new Date()
  const startedAt = new Date(stream.started_at)
  const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime())
  const elapsedMinutes = elapsedMs / (1000 * 60)

  // Check 2-hour hard expiry
  if (stream.expires_at && new Date(stream.expires_at) < now) {
    await supabase.from('live_streams')
      .update({ is_live: false, ended_at: now.toISOString() })
      .eq('id', stream_id)
    return NextResponse.json({ forceStopped: true, reason: '2h_limit' })
  }

  // Check daily 10-minute limit
  const today = now.toISOString().split('T')[0]
  const { data: usageRow } = await supabase
    .from('live_daily_usage')
    .select('minutes_used')
    .eq('user_id', user.id)
    .eq('usage_date', today)
    .maybeSingle()

  const prevCompletedMinutes = usageRow?.minutes_used ?? 0
  const totalMinutes = prevCompletedMinutes + elapsedMinutes

  if (totalMinutes >= 10) {
    // Force-stop and record usage
    await supabase.from('live_streams')
      .update({ is_live: false, ended_at: now.toISOString() })
      .eq('id', stream_id)

    const newMinutes = Math.min(10, prevCompletedMinutes + Math.ceil(elapsedMinutes))
    await supabase.from('live_daily_usage').upsert(
      { user_id: user.id, usage_date: today, minutes_used: newMinutes },
      { onConflict: 'user_id,usage_date' }
    )
    return NextResponse.json({ forceStopped: true, reason: 'daily_limit' })
  }

  const minutesRemaining = Math.max(0, Math.floor(10 - totalMinutes))
  const quality = calcQuality(elapsedMinutes)
  const followers = (stream.profiles as any)?.followers_count ?? 0
  const viewerCount = calcLiveViewers(followers, elapsedMinutes)
  const peakViewers = Math.max(stream.peak_viewer_count ?? 0, viewerCount)

  await supabase.from('live_streams').update({
    viewer_count: viewerCount,
    peak_viewer_count: peakViewers,
    quality,
  }).eq('id', stream_id)

  return NextResponse.json({
    ok: true,
    viewerCount,
    quality,
    elapsedMinutes: Math.round(elapsedMinutes),
    minutesRemaining,
  })
}
