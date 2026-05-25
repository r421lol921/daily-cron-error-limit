import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Simulation engine: runs on each call, picks posts that haven't hit 8 real views yet
// and increments stats proportional to the post author's follower count.
export async function POST() {
  const supabase = await createClient()

  // Fetch active (non-archived) posts with their author follower counts
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, views_count, real_views_count, likes_count, reposts_count, saves_count, is_archived, user_id, profiles!posts_user_id_fkey(followers_count)')
    .eq('is_archived', false)
    .limit(100)

  if (error || !posts) return NextResponse.json({ ok: false })

  for (const post of posts) {
    const followers = (post.profiles as { followers_count: number } | null)?.followers_count ?? 0

    if (post.real_views_count >= 8) {
      // Archive this post – stop simulation
      await supabase.from('posts').update({ is_archived: true }).eq('id', post.id)
      continue
    }

    // Simulation rate: proportional to follower count, capped
    // Higher followers = more simulated engagement per tick
    const base = Math.max(1, Math.floor(followers / 5000))
    const viewInc = base * 3 + Math.floor(Math.random() * base * 5)
    const likeChance = followers > 100000 ? 0.4 : followers > 10000 ? 0.25 : 0.1
    const repostChance = likeChance * 0.3
    const saveChance = likeChance * 0.2

    const likeInc = Math.random() < likeChance ? Math.floor(Math.random() * base) + 1 : 0
    const repostInc = Math.random() < repostChance ? Math.floor(Math.random() * Math.max(1, base * 0.5)) : 0
    const saveInc = Math.random() < saveChance ? Math.floor(Math.random() * Math.max(1, base * 0.3)) : 0

    await supabase.from('posts').update({
      views_count: post.views_count + viewInc,
      likes_count: post.likes_count + likeInc,
      reposts_count: post.reposts_count + repostInc,
      saves_count: post.saves_count + saveInc,
    }).eq('id', post.id)
  }

  // Simulate oat views (same proportional logic as posts)
  const { data: oats } = await supabase
    .from('oats')
    .select('id, views_count, real_views_count, likes_count, saves_count, is_archived, user_id, profiles!oats_user_id_fkey(followers_count, oat_views_count, id)')
    .eq('is_archived', false)
    .limit(50)

  if (oats) {
    for (const oat of oats) {
      const followers = (oat.profiles as any)?.followers_count ?? 0

      if (oat.real_views_count >= 8) {
        await supabase.from('oats').update({ is_archived: true }).eq('id', oat.id)
        continue
      }

      const base = Math.max(1, Math.floor(followers / 5000))
      const viewInc = base * 4 + Math.floor(Math.random() * base * 6)
      const likeChance = followers > 100000 ? 0.45 : followers > 10000 ? 0.28 : 0.12
      const saveChance = likeChance * 0.25

      const likeInc = Math.random() < likeChance ? Math.floor(Math.random() * base) + 1 : 0
      const saveInc = Math.random() < saveChance ? Math.floor(Math.random() * Math.max(1, base * 0.3)) : 0

      await supabase.from('oats').update({
        views_count: oat.views_count + viewInc,
        real_views_count: oat.real_views_count + 1,
        likes_count: oat.likes_count + likeInc,
        saves_count: oat.saves_count + saveInc,
      }).eq('id', oat.id)

      // Accumulate total oat views on profile
      if (viewInc > 0 && (oat.profiles as any)?.id) {
        const currentOatViews = (oat.profiles as any)?.oat_views_count ?? 0
        await supabase.from('profiles').update({
          oat_views_count: currentOatViews + viewInc,
        }).eq('id', (oat.profiles as any).id)
      }
    }
  }

  return NextResponse.json({ ok: true, processed: posts.length, oats_processed: oats?.length ?? 0 })
}
