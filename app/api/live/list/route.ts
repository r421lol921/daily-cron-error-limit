import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  const { data: streams, error } = await supabase
    .from('live_streams')
    .select('*, profiles!live_streams_user_id_fkey(*)')
    .eq('is_live', true)
    .order('viewer_count', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ streams: streams ?? [] })
}
