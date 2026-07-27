import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const USER_CAP = 400

/**
 * GET /api/waitlist
 * Returns { count, isFull, cap } so the signup page can decide
 * whether to show normal signup or the waitlist form.
 */
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase.rpc('get_confirmed_user_count')
    if (error) throw error
    const count: number = data ?? 0
    return NextResponse.json({ count, isFull: count >= USER_CAP, cap: USER_CAP })
  } catch (err) {
    console.error('[waitlist] GET error:', err)
    return NextResponse.json({ count: 0, isFull: false, cap: USER_CAP })
  }
}

/**
 * POST /api/waitlist
 * Body: { email, display_name, username, password }
 * Adds the user to the waitlist queue if the site is at capacity.
 * Returns { position } on success.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, display_name, username, password } = body as {
      email: string
      display_name: string
      username: string
      password: string
    }

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Double-check capacity to avoid a race condition
    const { data: countData } = await supabase.rpc('get_confirmed_user_count')
    const count: number = countData ?? 0
    if (count < USER_CAP) {
      return NextResponse.json({ error: 'Site is not full — please sign up normally.' }, { status: 409 })
    }

    // Check for duplicate email in waitlist
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, position, status')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        position: existing.position,
        status: existing.status,
        alreadyWaiting: true,
      })
    }

    // Get next position
    const { data: posData } = await supabase.rpc('get_next_waitlist_position')
    const position: number = posData ?? 1

    const { error: insertError } = await supabase.from('waitlist').insert({
      email,
      display_name: display_name || username,
      username,
      // Store the password so we can auto-create the account later.
      // This is stored temporarily; the cleanup route deletes waitlist rows after they're invited.
      password_hash: password,
      position,
      status: 'waiting',
    })

    if (insertError) throw insertError

    return NextResponse.json({ position, status: 'waiting' })
  } catch (err) {
    console.error('[waitlist] POST error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}
