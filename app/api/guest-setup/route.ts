import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!existing) {
    // Create guest profile using service-level upsert
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      username: `guest_${user.id.slice(0, 8)}`,
      display_name: 'Guest',
      is_guest: true,
      followers_count: 0,
      following_count: 0,
      posts_count: 0,
      oat_views_count: 0,
    }, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
