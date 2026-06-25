import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Realistic viral view curve ─────────────────────────────────────────────
// Models how a real video accrues views over 30 hours based on follower count.
// Peak velocity is ~2-5 hours in, then it decelerates. By hour 30 the clip expires.
//
// Target totals after 30 hours (realistic):
//   4M followers  → ~1.0M–1.4M views
//   1M followers  → ~250K–320K views
//   500K followers → ~120K–160K views
//   100K followers → ~20K–30K views
//   10K followers  → ~1.5K–2.5K views
//   1K followers   → ~80–150 views
//
// Each simulate call represents one "tick". We calculate how many views the
// clip *should* have at this point in time and compute the delta vs current.

function targetViewsAtAge(followers: number, ageHours: number): number {
  if (ageHours <= 0) return 0

  // Scale: 4M followers → ~1.2M total, 1M → ~285K, 100K → ~25K
  const totalTarget = Math.round(followers * 0.30)

  // Viral ramp curve: fast rise peaking at ~hour 3, slow decline through hour 30
  // Using a log-normal-inspired shape: rises quickly, plateaus, fades
  const peak = 3.0 // hours to peak
  const t = ageHours / 30 // 0..1 over clip lifetime
  const p = peak / 30     // normalised peak

  // Piecewise: fast ramp up to peak, then slow decay
  let fraction: number
  if (t <= p) {
    // Rising phase — cubic ease in to peak fraction
    fraction = 0.62 * Math.pow(t / p, 1.6)
  } else {
    // Decaying phase — rest of 38% accrues slowly
    const decay = (t - p) / (1 - p) // 0..1 post-peak
    fraction = 0.62 + 0.38 * (1 - Math.pow(1 - decay, 2.2))
  }

  return Math.round(totalTarget * fraction)
}

// Engagement ratios relative to views (realistic social media benchmarks)
const LIKE_RATIO   = 0.058  // ~5.8% of viewers like
const SAVE_RATIO   = 0.022  // ~2.2% save
const SHARE_RATIO  = 0.031  // ~3.1% share
// Comment probability per tick (not per view — AI comments are sparse)
const COMMENT_PROB_PER_TICK = 0.22

export async function POST(request: Request) {
  // Allow the cron (or callers) to compress multiple hourly ticks into one run.
  // e.g. ?ticks=28 simulates 28 hours of progression in a single invocation.
  const url = new URL(request.url)
  const ticks = Math.min(Math.max(1, parseInt(url.searchParams.get('ticks') ?? '1', 10)), 48)

  let totalPosts = 0
  let totalOats = 0

  for (let tick = 0; tick < ticks; tick++) {
    const result = await runSimulateTick()
    totalPosts += result.posts
    totalOats += result.oats
  }

  return NextResponse.json({ ok: true, ticks, posts: totalPosts, oats: totalOats })
}

async function runSimulateTick() {
  const supabase = await createClient()

  // ── Posts simulation (existing, unchanged logic) ──────────────────────────
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, views_count, real_views_count, likes_count, reposts_count, saves_count, is_archived, user_id, profiles!posts_user_id_fkey(followers_count)')
    .eq('is_archived', false)
    .limit(100)

  if (!error && posts) {
    for (const post of posts) {
      const followers = (post.profiles as unknown as { followers_count: number } | null)?.followers_count ?? 0

      if ((post.real_views_count ?? 0) >= 8) {
        await supabase.from('posts').update({ is_archived: true }).eq('id', post.id)
        continue
      }

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
        real_views_count: (post.real_views_count ?? 0) + 1,
        likes_count: post.likes_count + likeInc,
        reposts_count: post.reposts_count + repostInc,
        saves_count: post.saves_count + saveInc,
      }).eq('id', post.id)
    }
  }

  // ── Oats simulation (time-based viral curve) ───────────────────────────────
  const now = Date.now()

  const { data: oats } = await supabase
    .from('oats')
    .select('id, views_count, likes_count, saves_count, shares_count, comments_count, caption, is_archived, created_at, expires_at, user_id, profiles!oats_user_id_fkey(followers_count, oat_views_count, id)')
    .eq('is_archived', false)
    .limit(50)

  // Pre-fetch collab follower counts for oats that have @mentions in caption
  const collabBoostMap: Record<string, number> = {}
  if (oats) {
    const mentionedUsernames = oats
      .map(o => { const m = o.caption?.match(/@([A-Za-z0-9_]+)/); return m ? m[1].toLowerCase() : null })
      .filter(Boolean) as string[]
    const unique = [...new Set(mentionedUsernames)]
    if (unique.length > 0) {
      const { data: collabProfiles } = await supabase
        .from('profiles')
        .select('username, followers_count')
        .in('username', unique)
      if (collabProfiles) {
        for (const cp of collabProfiles) {
          collabBoostMap[cp.username.toLowerCase()] = cp.followers_count ?? 0
        }
      }
    }
  }

  if (oats) {
    for (const oat of oats) {
      const ownerFollowers = (oat.profiles as any)?.followers_count ?? 0
      const mention = oat.caption?.match(/@([A-Za-z0-9_]+)/)?.[1]?.toLowerCase() ?? null
      const collabFollowers = mention ? (collabBoostMap[mention] ?? 0) : 0
      // Combined audience: owner + collab (additive reach)
      const followers = ownerFollowers + collabFollowers

      // Check if expired
      if (oat.expires_at && new Date(oat.expires_at).getTime() < now) {
        await supabase.from('oats').update({ is_archived: true }).eq('id', oat.id)
        continue
      }

      const createdAt = new Date(oat.created_at).getTime()
      const ageMs = now - createdAt
      const ageHours = ageMs / (1000 * 60 * 60)

      // Calculate where this clip should be right now
      const targetViews = targetViewsAtAge(followers, ageHours)
      const currentViews = oat.views_count ?? 0

      // Raw delta — how many views to add this tick
      const rawDelta = Math.max(0, targetViews - currentViews)
      if (rawDelta === 0 && Math.random() > 0.1) continue // no-op most of the time when caught up

      // Apply a fraction of the delta each tick with jitter so it feels organic
      // Tick fraction: ~8-20% of remaining gap, so it "catches up" gradually
      const tickFraction = 0.10 + Math.random() * 0.10
      const viewInc = Math.max(0, Math.round(rawDelta * tickFraction * (0.7 + Math.random() * 0.6)))

      if (viewInc === 0 && rawDelta === 0) continue

      // Derive engagement counts from total accumulated views (so they scale correctly)
      const newTotalViews = currentViews + viewInc
      const targetLikes  = Math.round(newTotalViews * LIKE_RATIO  * (0.85 + Math.random() * 0.3))
      const targetSaves  = Math.round(newTotalViews * SAVE_RATIO  * (0.85 + Math.random() * 0.3))
      const targetShares = Math.round(newTotalViews * SHARE_RATIO * (0.85 + Math.random() * 0.3))

      const currentLikes  = oat.likes_count  ?? 0
      const currentSaves  = oat.saves_count  ?? 0
      const currentShares = oat.shares_count ?? 0

      const likeInc  = Math.max(0, targetLikes  - currentLikes)
      const saveInc  = Math.max(0, targetSaves  - currentSaves)
      const shareInc = Math.max(0, targetShares - currentShares)

      await supabase.from('oats').update({
        views_count:  newTotalViews,
        likes_count:  currentLikes  + likeInc,
        saves_count:  currentSaves  + saveInc,
        shares_count: currentShares + shareInc,
      }).eq('id', oat.id)

      // Accumulate total oat views on profile
      if (viewInc > 0 && (oat.profiles as any)?.id) {
        const profileId = (oat.profiles as any).id
        const currentOatViews = (oat.profiles as any)?.oat_views_count ?? 0
        await supabase.from('profiles').update({
          oat_views_count: currentOatViews + viewInc,
        }).eq('id', profileId)
      }

      // Probabilistically trigger an AI comment (fires only occasionally per tick)
      if (Math.random() < COMMENT_PROB_PER_TICK) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        fetch(`${baseUrl}/api/ai-comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oat_id: oat.id, caption: (oat as any).caption ?? '' }),
        }).catch(() => {})
      }
    }
  }

  return { posts: posts?.length ?? 0, oats: oats?.length ?? 0 }
}
