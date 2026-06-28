import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { target_id } = body
  if (!target_id) return NextResponse.json({ error: 'target_id required' }, { status: 400 })
  if (target_id === user.id) return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 })

  // Check if already subscribed
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('target_id', target_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ ok: true, subscribed: true, alreadySubscribed: true })
  }

  const { error } = await supabase
    .from('subscriptions')
    .insert({ subscriber_id: user.id, target_id })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, subscribed: true })
}

// Check subscription status
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ subscribed: false })

  const url = new URL(request.url)
  const target_id = url.searchParams.get('target_id')
  if (!target_id) return NextResponse.json({ subscribed: false })

  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', user.id)
    .eq('target_id', target_id)
    .maybeSingle()

  return NextResponse.json({ subscribed: !!data })
}
