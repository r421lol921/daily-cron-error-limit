import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Run on Node runtime so we can use the Supabase service-role client for storage deletes
export const runtime = 'nodejs'

/**
 * Extracts the storage path from a Supabase public URL.
 * e.g. "https://<ref>.supabase.co/storage/v1/object/public/post-media/userId/file.mp4"
 *       → "userId/file.mp4"
 */
function extractStoragePath(url: string): string | null {
  try {
    const u = new URL(url)
    // pathname: /storage/v1/object/public/<bucket>/<path>
    const parts = u.pathname.split('/storage/v1/object/public/')
    if (parts.length < 2) return null
    const withBucket = parts[1] // "<bucket>/<path>"
    const slashIdx = withBucket.indexOf('/')
    if (slashIdx === -1) return null
    return withBucket.slice(slashIdx + 1) // just the path
  } catch {
    return null
  }
}

async function deleteStorageFiles(
  supabase: ReturnType<typeof createServiceClient>,
  bucket: string,
  urls: string[]
) {
  const paths = urls.map(extractStoragePath).filter(Boolean) as string[]
  if (paths.length === 0) return
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) {
    console.error(`[cleanup] storage delete error (${bucket}):`, error.message)
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // ── 1. Collect expired post media URLs before deleting rows ──────────────
    const { data: expiredPosts } = await supabase
      .from('posts')
      .select('id, media_urls, image_url')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())

    // ── 2. Collect expired oat video URLs before deleting rows ───────────────
    const { data: expiredOats } = await supabase
      .from('oats')
      .select('id, video_url, thumbnail_url')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())

    // ── 3. Run DB cleanup (cascade deletes likes/saves/etc.) ─────────────────
    const { data: dbResult, error: dbError } = await supabase.rpc('cleanup_expired_content')
    if (dbError) throw dbError

    // ── 4. Delete post-media storage files ───────────────────────────────────
    if (expiredPosts && expiredPosts.length > 0) {
      const postMediaUrls: string[] = []
      for (const post of expiredPosts) {
        if (post.image_url) postMediaUrls.push(post.image_url)
        if (Array.isArray(post.media_urls)) postMediaUrls.push(...post.media_urls)
      }
      // Only delete files that belong to our own post-media bucket
      const ours = postMediaUrls.filter(u => u.includes('/post-media/'))
      await deleteStorageFiles(supabase, 'post-media', ours)
    }

    // ── 5. Delete oat-videos storage files ───────────────────────────────────
    if (expiredOats && expiredOats.length > 0) {
      const oatVideoUrls: string[] = []
      for (const oat of expiredOats) {
        if (oat.video_url) oatVideoUrls.push(oat.video_url)
        if (oat.thumbnail_url) oatVideoUrls.push(oat.thumbnail_url)
      }
      const ours = oatVideoUrls.filter(u => u.includes('/oat-videos/'))
      await deleteStorageFiles(supabase, 'oat-videos', ours)
    }

    return NextResponse.json({
      success: true,
      db: dbResult,
      storage_posts_cleaned: expiredPosts?.length ?? 0,
      storage_oats_cleaned: expiredOats?.length ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cleanup] error:', error)
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST with Authorization: Bearer <CRON_SECRET> to run cleanup.',
    note: 'Deletes posts, oats, and their storage files after 30 hours.',
  })
}
