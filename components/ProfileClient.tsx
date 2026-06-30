'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatFollowers, formatJoinDate, formatCount } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import Odometer from './Odometer'
import OatsPlayer from './OatsPlayer'
import EditProfileModal from './EditProfileModal'
import type { Post, Profile, OatPost, LiveStream } from '@/lib/types'
// PostCard kept for Likes/Videos tabs
import OatsLogo from './OatsLogo'
import LiveViewerModal from './LiveViewerModal'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

/** Thumbnail card with a silent 2-second preview on hover */
function ProfileClipCard({ oat, onClick }: { oat: OatPost; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative aspect-[9/16] bg-black overflow-hidden group focus:outline-none"
      aria-label={oat.caption || 'View clip'}
    >
      {oat.video_url ? (
        <video
          src={oat.video_url}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : oat.thumbnail_url ? (
        <img
          src={oat.thumbnail_url}
          alt={oat.caption || ''}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
          <OatsLogo className="w-8 h-8 text-white/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
        <div className="flex items-center gap-0.5 text-white text-[10px] font-bold drop-shadow">
          <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          {(oat.views_count || 0).toLocaleString()}
        </div>
      </div>
    </button>
  )
}

interface Props {
  profile: Profile
  posts: Post[]
  currentUserId: string
  isFollowing: boolean
  isOwner: boolean
  isSubscribed?: boolean
}

export default function ProfileClient({ profile: initialProfile, posts: initialPosts, currentUserId, isFollowing: initialFollowing, isOwner, isSubscribed: initialSubscribed = false }: Props) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [videoPosts, setVideoPosts] = useState<Post[]>([])
  const [oatPosts, setOatPosts] = useState<OatPost[]>([])
  const [bookmarkedOats, setBookmarkedOats] = useState<OatPost[]>([])
  const [pastStreams, setPastStreams] = useState<LiveStream[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [following, setFollowing] = useState(initialFollowing)
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [subscribeLoading, setSubscribeLoading] = useState(false)
  const [followers, setFollowers] = useState(initialProfile.followers_count)
  const [tab, setTab] = useState<'oats' | 'bookmarked' | 'likes' | 'videos' | 'live'>('oats')
  const [totalLikes, setTotalLikes] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [activeLiveStream, setActiveLiveStream] = useState<LiveStream | null>(null)

  // Edit profile modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  // Image viewer state
  const [imageViewer, setImageViewer] = useState<{ src: string; label: string } | null>(null)

  // Oat player modal
  const [activeOat, setActiveOat] = useState<OatPost | null>(null)
  const [activeOatIndex, setActiveOatIndex] = useState(0)
  const [activeOatList, setActiveOatList] = useState<OatPost[]>([])

  const loadTabData = useCallback(async (t: 'oats' | 'bookmarked' | 'likes' | 'videos' | 'live') => {
    const supabase = createClient()
    setTabLoading(true)
    if (t === 'oats') {
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('oats')
        .select('*, profiles!oats_user_id_fkey(*)')
        .eq('user_id', initialProfile.id)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false })
        .limit(50)
      // Fetch liked/saved flags for current user
      let likedSet: string[] = []
      let savedSet: string[] = []
      if (currentUserId && data && data.length > 0) {
        const ids = data.map((o: any) => o.id)
        const [lr, sr] = await Promise.all([
          supabase.from('oat_likes').select('oat_id').eq('user_id', currentUserId).in('oat_id', ids),
          supabase.from('oat_saves').select('oat_id').eq('user_id', currentUserId).in('oat_id', ids),
        ])
        likedSet = (lr.data || []).map((r: any) => r.oat_id)
        savedSet = (sr.data || []).map((r: any) => r.oat_id)
      }
      setOatPosts(((data || []) as OatPost[]).map(o => ({
        ...o,
        user_liked: likedSet.includes(o.id),
        user_saved: savedSet.includes(o.id),
      })))
    } else if (t === 'bookmarked') {
      if (!currentUserId || currentUserId !== initialProfile.id) {
        setBookmarkedOats([])
        setTabLoading(false)
        return
      }
      const now = new Date().toISOString()
      const { data } = await supabase
        .from('oat_saves')
        .select('oat_id, oats(*, profiles!oats_user_id_fkey(*))')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(50)
      const saved = (data || [])
        .map((row: any) => row.oats)
        .filter((o: any) => o && (!o.expires_at || o.expires_at > now)) as OatPost[]
      // Mark all as saved
      setBookmarkedOats(saved.map(o => ({ ...o, user_saved: true })))
    } else if (t === 'likes') {
      const nowTs = new Date().toISOString()
      const { data } = await supabase
        .from('likes')
        .select('post_id, posts(*, profiles!posts_user_id_fkey(*))')
        .eq('user_id', initialProfile.id)
        .order('created_at', { ascending: false })
        .limit(50)
      const liked = (data || [])
        .map((row: any) => row.posts)
        .filter((p: any) => p && (!p.expires_at || p.expires_at > nowTs))
      setLikedPosts(liked as Post[])
    } else if (t === 'videos') {
      const nowStr = new Date().toISOString()
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .eq('user_id', initialProfile.id)
        .or(`expires_at.is.null,expires_at.gt.${nowStr}`)
        .order('created_at', { ascending: false })
        .limit(100)
      const videos = ((data as Post[]) || []).filter(p =>
        (p.media_urls || []).some(url =>
          /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video')
        )
      )
      setVideoPosts(videos)
    } else if (t === 'live') {
      const { data } = await supabase
        .from('live_streams')
        .select('*, profiles!live_streams_user_id_fkey(*)')
        .eq('user_id', initialProfile.id)
        .order('started_at', { ascending: false })
        .limit(30)
      setPastStreams((data || []) as LiveStream[])
    }
    setTabLoading(false)
  }, [initialProfile.id, currentUserId])

  useEffect(() => {
    loadTabData('oats')

    // Trigger simulate on mount and on tab/window focus
    const triggerSim = () => fetch('/api/simulate', { method: 'POST' }).catch(() => {})
    triggerSim()
    const onFocus = () => triggerSim()
    const onVisible = () => { if (document.visibilityState === 'visible') triggerSim() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    const supabase = createClient()

    // Fetch authoritative totals from DB — always use this, never derive from oatPosts
    const fetchStats = async () => {
      const { data: oatsData } = await supabase
        .from('oats')
        .select('likes_count, views_count')
        .eq('user_id', initialProfile.id)
        .eq('is_archived', false)
      if (oatsData) {
        setTotalLikes(oatsData.reduce((s: number, o: any) => s + (o.likes_count ?? 0), 0))
        setTotalViews(oatsData.reduce((s: number, o: any) => s + (o.views_count ?? 0), 0))
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('oat_views_count, followers_count')
        .eq('id', initialProfile.id)
        .single()
      if (prof) {
        setFollowers(prof.followers_count ?? 0)
      }
    }

    // Load immediately on mount so values are correct from the start
    fetchStats()

    // Realtime: any UPDATE on this user's oats re-fetches totals
    const oatsChannel = supabase
      .channel(`profile-oats-${initialProfile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'oats', filter: `user_id=eq.${initialProfile.id}` },
        () => { fetchStats() }
      )
      .subscribe()

    // Realtime: any UPDATE on this user's profile row (followers_count)
    const profileChannel = supabase
      .channel(`profile-row-${initialProfile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${initialProfile.id}` },
        (payload) => {
          const p = payload.new as any
          if (p.followers_count !== undefined) setFollowers(p.followers_count)
        }
      )
      .subscribe()

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
      supabase.removeChannel(oatsChannel)
      supabase.removeChannel(profileChannel)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'bookmarked' && bookmarkedOats.length === 0) loadTabData('bookmarked')
    if (tab === 'likes' && likedPosts.length === 0) loadTabData('likes')
    if (tab === 'videos' && videoPosts.length === 0) loadTabData('videos')
    if (tab === 'live' && pastStreams.length === 0) loadTabData('live')
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubscribe() {
    if (!currentUserId) { router.push('/auth/login'); return }
    if (subscribed) return // no unsubscribe
    setSubscribeLoading(true)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: profile.id }),
      })
      setSubscribed(true)
    } finally {
      setSubscribeLoading(false)
    }
  }

  async function handleFollow() {
    if (!currentUserId) { router.push('/auth/login'); return }
    setFollowLoading(true)
    const supabase = createClient()
    if (following) {
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: profile.id })
      setFollowing(false)
      setFollowers(f => Math.max(0, f - 1))
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      setFollowing(true)
      setFollowers(f => f + 1)
    }
    setFollowLoading(false)
  }

  function handleSaveProfile(updatedProfile: Profile) {
    setProfile(updatedProfile)
    setEditSaved(true)
    setTimeout(() => setEditSaved(false), 2000)
  }

  function openOatPlayer(oat: OatPost, list: OatPost[], index: number) {
    setActiveOat(oat)
    setActiveOatList(list)
    setActiveOatIndex(index)
  }

  function closeOatPlayer() {
    setActiveOat(null)
  }

  const isVerified = profile.is_verified === true
  const isGuest = (profile as any).is_guest === true
  const displayAvatar = isGuest ? null : (profile.avatar_url || DEFAULT_AVATAR)
  const displayBanner = isGuest ? null : profile.banner_url

  return (
    <div className="min-h-screen">
      {/* Image viewer modal */}
      {imageViewer && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setImageViewer(null)}
        >
          <button
            onClick={() => setImageViewer(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 rounded-full p-2.5 text-white transition"
            aria-label="Close image viewer"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img
              src={imageViewer.src}
              alt={imageViewer.label}
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <p className="text-white/60 text-xs text-center mt-2 font-medium">{imageViewer.label}</p>
          </div>
        </div>
      )}

      {/* Oat player modal */}
      {activeOat && (
        <div className="fixed inset-0 z-[150] bg-black flex items-center justify-center">
          <button
            onClick={closeOatPlayer}
            className="absolute top-4 left-4 z-[160] bg-black/50 backdrop-blur-sm rounded-full p-2 text-white hover:bg-black/70 transition"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="relative w-full h-full max-w-[430px] mx-auto">
            <OatsPlayer
              oat={activeOat}
              currentUserId={currentUserId}
              isActive={true}
              onViewCounted={() => {}}
            />
            {/* Nav arrows removed — swipe or scroll to navigate */}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 py-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-xl text-foreground leading-tight">{profile.display_name}</h2>
            {isVerified && <VerifiedBadge size={18} />}
          </div>
          <p className="text-foreground-secondary text-xs">{formatCount(oatPosts.length)} {oatPosts.length === 1 ? 'Clip' : 'Clips'}</p>
        </div>
      </header>

      {/* Banner */}
      <div className={`h-36 xs:h-48 relative overflow-hidden ${isGuest ? 'bg-neutral-700' : 'bg-muted'}`}>
        {displayBanner ? (
          <button
            className="absolute inset-0 w-full h-full group"
            onClick={() => setImageViewer({ src: displayBanner, label: 'Banner' })}
            aria-label="View banner"
            type="button"
          >
            <Image src={displayBanner} alt="Banner" fill className="object-cover" unoptimized />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
          </button>
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
      </div>

      {/* Profile info section */}
      <div className="px-4 pb-4 relative">
        {/* Avatar + Edit button row */}
        <div className="flex justify-between items-start -mt-12 mb-3">
          {/* Avatar */}
          <div className="relative">
            {isGuest ? (
              <div className="w-24 h-24 xs:w-32 xs:h-32 rounded-full border-4 border-background bg-neutral-600 flex-shrink-0" />
            ) : (
            <button
              className="w-24 h-24 xs:w-32 xs:h-32 rounded-full border-4 border-background overflow-hidden bg-muted flex-shrink-0 group relative block"
              onClick={() => displayAvatar && setImageViewer({ src: displayAvatar, label: 'Profile Picture' })}
              type="button"
              aria-label="View profile picture"
            >
              {displayAvatar && (
                <Image
                  src={displayAvatar}
                  alt={profile.display_name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover rounded-full"
                  unoptimized
                />
              )}
              {displayAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
              )}
            </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="mt-14 xs:mt-16 flex items-center gap-2">
            {!isOwner && !isGuest && (
              <>
                {/* Heart follow button */}
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  aria-label={following ? 'Unfollow' : 'Follow'}
                  className={`w-10 h-10 rounded-full border flex items-center justify-center transition disabled:opacity-60 ${
                    following
                      ? 'bg-pink-500/10 border-pink-500/40 text-pink-500 hover:bg-pink-500/20'
                      : 'bg-muted border-border text-foreground-secondary hover:bg-foreground/10'
                  }`}
                >
                  {followLoading ? (
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={following ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  )}
                </button>

                {/* Subscribe button */}
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeLoading || subscribed}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold border transition disabled:opacity-70 ${
                    subscribed
                      ? 'bg-primary/10 border-primary/40 text-primary cursor-default'
                      : 'bg-primary border-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill={subscribed ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  {subscribeLoading ? 'Subscribing...' : subscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Name and username */}
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h1 className="font-black text-xl text-foreground">{profile.display_name}</h1>
          {isVerified && <VerifiedBadge size={20} />}
        </div>
        <p className="text-foreground-secondary text-sm mb-3">@{profile.username}</p>

        {/* Bio (view mode) — hidden for guests */}
        {profile.bio && !isGuest && (
          <p className={`text-foreground text-sm leading-relaxed mb-3 ${profile.bio_italic ? 'italic' : ''}`}>
            {profile.bio}
          </p>
        )}

        {/* Meta — hidden for guests */}
        {!isGuest && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-foreground-secondary text-sm mb-3">
            {profile.location && (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {profile.location}
              </span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline" onClick={e => e.stopPropagation()}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
              Joined {formatJoinDate(profile.joined_at || profile.created_at)}
            </span>
          </div>
        )}

        {/* Stats pill badges — like reference screenshot */}
        {!(profile as any).is_guest && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Link
              href={`/profile/${profile.username}/followers`}
              className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-foreground/10 transition"
            >
              <Odometer value={followers} />
              <span className="text-foreground-secondary">Followers</span>
            </Link>
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-semibold text-foreground">
              <Odometer value={totalLikes} />
              <span className="text-foreground-secondary">Likes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-semibold text-foreground">
              <Odometer value={totalViews} />
              <span className="text-foreground-secondary">Views</span>
            </div>
            {/* Social link icons — only show when URLs are set */}
            {profile.tiktok_url && (
              <a
                href={profile.tiktok_url.startsWith('http') ? profile.tiktok_url : `https://${profile.tiktok_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 bg-muted rounded-full hover:bg-foreground/10 transition"
                aria-label="TikTok"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-foreground" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.8 1.54V6.78a4.85 4.85 0 01-1.03-.09z"/>
                </svg>
              </a>
            )}
            {profile.youtube_url && (
              <a
                href={profile.youtube_url.startsWith('http') ? profile.youtube_url : `https://${profile.youtube_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 bg-muted rounded-full hover:bg-foreground/10 transition"
                aria-label="YouTube"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-foreground" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            )}
          </div>
        )}

        {/* Edit profile button (owner, non-guest) */}
        {isOwner && !(profile as any).is_guest && (
          <button
            onClick={() => { if (!editSaved) setEditModalOpen(true) }}
            className={`mt-3 w-full rounded-xl border py-2 text-sm font-semibold transition flex items-center justify-center gap-1.5 ${
              editSaved
                ? 'border-green-500 text-green-600 bg-green-500/10'
                : 'border-border text-foreground hover:bg-foreground/5'
            }`}
          >
            {editSaved ? (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : 'Edit Profile'}
          </button>
        )}
      </div>

      {/* Profile tabs — labeled text style matching reference screenshot */}
      <nav className="flex border-b border-border overflow-x-auto scrollbar-none">
        {([
          { key: 'oats',       label: 'Clips' },
          { key: 'bookmarked', label: 'Bookmarked' },
          { key: 'likes',      label: 'Likes' },
          { key: 'videos',     label: 'Videos' },
          { key: 'live',       label: 'Live' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 py-3 px-4 text-sm font-semibold transition hover:bg-foreground/5 relative whitespace-nowrap ${
              tab === key ? 'text-foreground' : 'text-foreground-secondary'
            }`}
          >
            {label}
            {tab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Live viewer modal */}
      {activeLiveStream && (
        <LiveViewerModal
          stream={activeLiveStream}
          isOwner={activeLiveStream.user_id === currentUserId}
          onClose={() => setActiveLiveStream(null)}
        />
      )}

      {/* Tab content */}
      {tabLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'live' ? (
        <div className="p-4">
          {pastStreams.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <svg viewBox="0 0 24 24" className="w-12 h-12 text-foreground-secondary opacity-40" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-xl font-black text-foreground">No broadcasts yet</p>
              <p className="text-foreground-secondary text-sm">
                {isOwner ? "You haven't gone live yet." : `@${profile.username} hasn't streamed yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {pastStreams.map(stream => (
                <button
                  key={stream.id}
                  onClick={() => stream.is_live && setActiveLiveStream(stream)}
                  className="text-left group focus:outline-none"
                  aria-label={stream.title}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden mb-2">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 24 24" className="w-10 h-10 text-white/20" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    {stream.is_live && (
                      <span className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {stream.is_live
                        ? `${(stream.viewer_count || 0).toLocaleString()} viewers`
                        : `${(stream.peak_viewer_count || 0).toLocaleString()} peak`}
                    </div>
                  </div>
                  <p className="text-foreground text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {stream.title}
                  </p>
                  <p className="text-foreground-secondary text-xs mt-0.5">{stream.category}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (tab === 'oats' || tab === 'bookmarked') ? (() => {
        const list = tab === 'oats' ? oatPosts : bookmarkedOats
        const emptyTitle = tab === 'oats' ? 'No Clips yet' : 'No bookmarks yet'
        const emptyMsg = tab === 'oats'
          ? (isOwner ? "You haven't posted any Clips yet." : `@${profile.username} hasn't posted any Clips yet.`)
          : (tab === 'bookmarked' && currentUserId !== profile.id)
          ? 'Bookmarks are private.'
          : "You haven't bookmarked any Clips yet."

        return list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
            <OatsLogo className="w-12 h-12 text-foreground-secondary opacity-50" />
            <p className="text-2xl font-black text-foreground">{emptyTitle}</p>
            <p className="text-foreground-secondary text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {list.map((oat, idx) => (
              <ProfileClipCard
                key={oat.id}
                oat={oat}
                onClick={() => openOatPlayer(oat, list, idx)}
              />
            ))}
          </div>
        )
      })() : (() => {
        const activePosts = tab === 'likes' ? likedPosts : videoPosts
        const emptyMsg = tab === 'likes'
          ? (isOwner ? "You haven't liked any posts yet." : `@${profile.username} hasn't liked anything yet.`)
          : (isOwner ? "You haven't posted any videos yet." : `@${profile.username} hasn't posted any videos yet.`)
        const emptyTitle = tab === 'likes' ? 'No likes yet' : 'No videos yet'
        return activePosts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
            <p className="text-2xl font-black text-foreground">{emptyTitle}</p>
            <p className="text-foreground-secondary text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div>
            {activePosts.map(post => (
              <div key={post.id} className="border-b border-border px-4 py-3 text-foreground text-sm">
                {post.content}
              </div>
            ))}
          </div>
        )
      })()}

      {/* Edit Profile Modal */}
      <EditProfileModal
        profile={profile}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveProfile}
        userId={profile.id}
      />
    </div>
  )
}
