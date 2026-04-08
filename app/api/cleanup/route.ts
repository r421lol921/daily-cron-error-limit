import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

// This endpoint should be called periodically (e.g., via Vercel Cron or external scheduler)
export async function POST(request: Request) {
  try {
    // Verify this is called from a trusted source (optional: add auth header check)
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Run cleanup functions
    await supabase.rpc('archive_old_posts')
    await supabase.rpc('mark_inactive_accounts')
    await supabase.rpc('delete_inactive_accounts')

    return NextResponse.json({ 
      success: true, 
      message: 'Cleanup completed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ 
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Allow GET for manual testing (remove in production)
export async function GET() {
  return NextResponse.json({ 
    message: 'Cleanup endpoint. Use POST with authorization header.',
    note: 'Set CRON_SECRET environment variable for security'
  })
}
