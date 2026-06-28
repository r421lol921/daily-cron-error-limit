import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'

// Run on Node runtime so we can use the Supabase service-role client for storage deletes
export const runtime = 'nodejs'

const INACTIVITY_DAYS = 2   // delete accounts inactive for this many days
const VIEW_RETENTION_DAYS = 7 // purge post_views older than this many days

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

/**
 * Delete a storage folder for a user (e.g. avatars/<userId>/, banners/<userId>/)
 * by listing all files in the folder first, then removing them.
 */
async function deleteUserFolder(
  supabase: ReturnType<typeof createServiceClient>,
  bucket: string,
  folderPrefix: string
) {
  const { data: files, error: listErr } = await supabase.storage
    .from(bucket)
    .list(folderPrefix)
  if (listErr || !files || files.length === 0) return
  const paths = files.map(f => `${folderPrefix}/${f.name}`)
  const { error } = await supabase.storage.from(bucket).remove(paths)
  if (error) {
    console.error(`[cleanup] folder delete error (${bucket}/${folderPrefix}):`, error.message)
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

    // ── 6. Inactivity cleanup: delete accounts idle for 2+ days ─────────────
    const inactiveCutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: inactiveProfiles } = await supabase
      .from('profiles')
      .select('id, avatar_url, banner_url')
      .lt('last_active_at', inactiveCutoff)

    let inactiveDeleted = 0

    if (inactiveProfiles && inactiveProfiles.length > 0) {
      for (const profile of inactiveProfiles) {
        // a. Delete their oat videos from storage
        const { data: userOats } = await supabase
          .from('oats')
          .select('video_url, thumbnail_url')
          .eq('user_id', profile.id)
        if (userOats && userOats.length > 0) {
          const oatUrls = userOats.flatMap(o => [o.video_url, o.thumbnail_url]).filter(Boolean) as string[]
          const oatOwned = oatUrls.filter(u => u.includes('/oat-videos/'))
          await deleteStorageFiles(supabase, 'oat-videos', oatOwned)
        }

        // b. Delete their post media from storage
        const { data: userPosts } = await supabase
          .from('posts')
          .select('media_urls, image_url')
          .eq('user_id', profile.id)
        if (userPosts && userPosts.length > 0) {
          const postUrls: string[] = []
          for (const p of userPosts) {
            if (p.image_url) postUrls.push(p.image_url)
            if (Array.isArray(p.media_urls)) postUrls.push(...p.media_urls)
          }
          const postOwned = postUrls.filter(u => u.includes('/post-media/'))
          await deleteStorageFiles(supabase, 'post-media', postOwned)
        }

        // c. Delete avatar + banner storage files
        await deleteUserFolder(supabase, 'avatars', profile.id)
        await deleteUserFolder(supabase, 'banners', profile.id)

        // d. Delete the auth user (cascades to profiles via on_delete cascade)
        const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(profile.id)
        if (authDeleteErr) {
          console.error(`[cleanup] failed to delete auth user ${profile.id}:`, authDeleteErr.message)
        } else {
          inactiveDeleted++
        }
      }

      // e. After freeing up slots, invite the next person(s) on the waitlist
      if (inactiveDeleted > 0) {
        const { data: nextInLine } = await supabase
          .from('waitlist')
          .select('id, email, display_name, username, password_hash')
          .eq('status', 'waiting')
          .order('position', { ascending: true })
          .limit(inactiveDeleted)

        if (nextInLine && nextInLine.length > 0) {
          for (const entry of nextInLine) {
            // Create the auth user for them
            const { error: createErr } = await supabase.auth.admin.createUser({
              email: entry.email,
              password: entry.password_hash,
              email_confirm: true,
              user_metadata: {
                display_name: entry.display_name || entry.username,
                username: entry.username,
              },
            })
            if (!createErr) {
              // Mark as invited so they're not processed again
              await supabase
                .from('waitlist')
                .update({ status: 'invited', invited_at: new Date().toISOString() })
                .eq('id', entry.id)
            } else {
              console.error(`[cleanup] failed to create waitlist user ${entry.email}:`, createErr.message)
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      db: dbResult,
      storage_posts_cleaned: expiredPosts?.length ?? 0,
      storage_oats_cleaned: expiredOats?.length ?? 0,
      inactive_accounts_deleted: inactiveDeleted,
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
    note: `Deletes posts, oats, and their storage files after 30 hours. Deletes accounts inactive for ${INACTIVITY_DAYS} days and purges post_views older than ${VIEW_RETENTION_DAYS} days.`,
  })
}
