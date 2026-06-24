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
import type { Post, Profile, OatPost } from '@/lib/types'
// PostCard kept for Likes/Videos tabs
import OatsLogo from './OatsLogo'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile
  posts: Post[]
  currentUserId: string
  isFollowing: boolean
  isOwner: boolean
}

export default function ProfileClient({ profile: initialProfile, posts: initialPosts, currentUserId, isFollowing: initialFollowing, isOwner }: Props) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [videoPosts, setVideoPosts] = useState<Post[]>([])
  const [oatPosts, setOatPosts] = useState<OatPost[]>([])
  const [bookmarkedOats, setBookmarkedOats] = useState<OatPost[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [following, setFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(initialProfile.followers_count)
  const [tab, setTab] = useState<'oats' | 'bookmarked' | 'likes' | 'videos'>('oats')

  // Edit profile modal state
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(initialProfile.display_name)
  const [editBio, setEditBio] = useState(initialProfile.bio)
  const [editLocation, setEditLocation] = useState(initialProfile.location)
  const [editWebsite, setEditWebsite] = useState(initialProfile.website)
  const [editBioItalic, setEditBioItalic] = useState(initialProfile.bio_italic ?? false)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  // Image viewer state
  const [imageViewer, setImageViewer] = useState<{ src: string; label: string } | null>(null)

  // Oat player modal
  const [activeOat, setActiveOat] = useState<OatPost | null>(null)
  const [activeOatIndex, setActiveOatIndex] = useState(0)
  const [activeOatList, setActiveOatList] = useState<OatPost[]>([])

  const loadTabData = useCallback(async (t: 'oats' | 'bookmarked' | 'likes' | 'videos') => {
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
    }
    setTabLoading(false)
  }, [initialProfile.id, currentUserId])

  useEffect(() => {
    loadTabData('oats')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'bookmarked' && bookmarkedOats.length === 0) loadTabData('bookmarked')
    if (tab === 'likes' && likedPosts.length === 0) loadTabData('likes')
    if (tab === 'videos' && videoPosts.length === 0) loadTabData('videos')
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFollow() {
    if (!currentUserId) { router.push('/auth/login'); return }
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
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) return null
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
    return urlData.publicUrl
  }

  async function handleSaveProfile() {
    setSaving(true)
    const supabase = createClient()
    let newAvatarUrl = profile.avatar_url
    let newBannerUrl = profile.banner_url

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop() || 'jpg'
      const url = await uploadFile(avatarFile, 'avatars', `${profile.id}/avatar-${Date.now()}.${ext}`)
      if (url) newAvatarUrl = url
    }
    if (bannerFile) {
      const ext = bannerFile.name.split('.').pop() || 'jpg'
      const url = await uploadFile(bannerFile, 'avatars', `${profile.id}/banner-${Date.now()}.${ext}`)
      if (url) newBannerUrl = url
    }

    const { data } = await supabase
      .from('profiles')
      .update({
        display_name: editName,
        bio: editBio,
        location: editLocation,
        website: editWebsite,
        avatar_url: newAvatarUrl,
        banner_url: newBannerUrl,
        bio_italic: editBioItalic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
      .select()
      .single()

    setSaving(false)
    if (data) {
      setProfile(data)
      setEditMode(false)
      setAvatarFile(null)
      setBannerFile(null)
      setAvatarPreview(null)
      setBannerPreview(null)
    }
  }

  function handleCancelEdit() {
    setEditMode(false)
    setAvatarFile(null)
    setBannerFile(null)
    setAvatarPreview(null)
    setBannerPreview(null)
    setEditName(profile.display_name)
    setEditBio(profile.bio)
    setEditLocation(profile.location)
    setEditWebsite(profile.website)
    setEditBioItalic(profile.bio_italic ?? false)
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
  const displayAvatar = isGuest ? null : (avatarPreview || profile.avatar_url || DEFAULT_AVATAR)
  const displayBanner = isGuest ? null : (bannerPreview || profile.banner_url)

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
            {activeOatIndex > 0 && (
              <button
                onClick={() => { const i = activeOatIndex - 1; setActiveOatIndex(i); setActiveOat(activeOatList[i]) }}
                className="absolute top-1/2 -translate-y-1/2 left-2 z-40 bg-black/40 backdrop-blur-sm rounded-full p-2 text-white hidden sm:flex"
                aria-label="Previous"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                </svg>
              </button>
            )}
            {activeOatIndex < activeOatList.length - 1 && (
              <button
                onClick={() => { const i = activeOatIndex + 1; setActiveOatIndex(i); setActiveOat(activeOatList[i]) }}
                className="absolute top-1/2 -translate-y-1/2 right-2 z-40 bg-black/40 backdrop-blur-sm rounded-full p-2 text-white hidden sm:flex"
                aria-label="Next"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            )}
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
          <p className="text-foreground-secondary text-xs">{formatCount(oatPosts.length)} Oats</p>
        </div>
      </header>

      {/* Banner */}
      <div className={`h-36 xs:h-48 relative overflow-hidden ${isGuest ? 'bg-neutral-700' : 'bg-muted'}`}>
        {displayBanner ? (
          <button
            className="absolute inset-0 w-full h-full group"
            onClick={() => !editMode && setImageViewer({ src: displayBanner, label: 'Banner' })}
            aria-label="View banner"
            type="button"
          >
            <Image src={displayBanner} alt="Banner" fill className="object-cover" unoptimized />
            {!editMode && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <span className="bg-black/60 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">Banner</span>
              </div>
            )}
          </button>
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        {editMode && (
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition group"
            type="button"
            aria-label="Change banner"
          >
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </div>
              <span className="text-white text-xs font-semibold">Change Banner</span>
            </div>
          </button>
        )}
        <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
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
              onClick={() => !editMode && displayAvatar && setImageViewer({ src: displayAvatar, label: 'Profile Picture' })}
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
              {!editMode && displayAvatar && (
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-full backdrop-blur-sm leading-tight text-center">Profile<br/>Picture</span>
                </div>
              )}
            </button>
            )}
            {editMode && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 transition"
                type="button"
                aria-label="Change avatar"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Action buttons */}
          <div className="mt-14 xs:mt-16">
            {isOwner ? (
              editMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-bold hover:bg-foreground/90 transition disabled:opacity-60"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : null
            ) : !isGuest && (
              <button
                onClick={handleFollow}
                className={`rounded-lg px-5 py-2 text-sm font-bold transition ${
                  following
                    ? 'bg-muted text-foreground border border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive'
                    : 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                }`}
                style={{ minWidth: 88 }}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Name and username */}
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <h1 className="font-black text-xl text-foreground">{profile.display_name}</h1>
          {isVerified && <VerifiedBadge size={20} />}
        </div>
        <p className="text-foreground-secondary text-sm mb-3">@{profile.username}</p>

        {/* Edit form */}
        {editMode && (
          <div className="flex flex-col gap-4 mb-4 p-4 border border-border rounded-2xl bg-background-secondary">
            <p className="font-bold text-foreground text-base">Edit profile</p>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Display name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={50}
                className="input-squared w-full"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-foreground-secondary">Bio</label>
                <button
                  type="button"
                  onClick={() => setEditBioItalic(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                    editBioItalic
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-foreground-secondary hover:bg-foreground/5'
                  }`}
                  aria-pressed={editBioItalic}
                >
                  <span className="italic font-bold">I</span>
                  Italic
                </button>
              </div>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                rows={3}
                maxLength={160}
                className={`input-squared resize-none w-full ${editBioItalic ? 'italic' : ''}`}
                placeholder="What's on your mind?"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Location</label>
              <input
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
                maxLength={30}
                className="input-squared w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Website</label>
              <input
                value={editWebsite}
                onChange={e => setEditWebsite(e.target.value)}
                maxLength={100}
                placeholder="https://"
                className="input-squared w-full"
              />
            </div>
          </div>
        )}

        {/* Bio (view mode) — hidden for guests */}
        {profile.bio && !editMode && !isGuest && (
          <p className={`text-foreground text-sm leading-relaxed mb-3 ${profile.bio_italic ? 'italic' : ''}`}>
            {profile.bio}
          </p>
        )}

        {/* Meta — hidden for guests */}
        {!editMode && !isGuest && (
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
          <div className="flex flex-wrap gap-2 mt-3">
            <Link
              href={`/profile/${profile.username}/followers`}
              className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-foreground/10 transition"
            >
              <Odometer value={followers} />
              <span className="text-foreground-secondary">Followers</span>
            </Link>
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-semibold text-foreground">
              <span>{formatCount(oatPosts.reduce((s, o) => s + o.likes_count, 0))}</span>
              <span className="text-foreground-secondary">Likes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1.5 text-xs font-semibold text-foreground">
              <span>{formatFollowers(profile.oat_views_count ?? 0)}</span>
              <span className="text-foreground-secondary">Views</span>
            </div>
          </div>
        )}

        {/* Edit bio button (owner, non-guest, not in editMode) */}
        {isOwner && !editMode && !(profile as any).is_guest && (
          <button
            onClick={() => setEditMode(true)}
            className="mt-3 w-full rounded-xl border border-border py-2 text-sm font-semibold text-foreground hover:bg-foreground/5 transition"
          >
            Edit bio
          </button>
        )}
      </div>

      {/* Profile tabs with icons matching reference */}
      <nav className="flex border-b border-border overflow-x-auto scrollbar-none">
        {(['oats', 'bookmarked', 'likes', 'videos'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-shrink-0 flex-1 min-w-0 py-3 px-2 text-xs font-bold capitalize transition hover:bg-foreground/5 relative flex flex-col items-center justify-center gap-0.5 ${
              tab === t ? 'text-foreground' : 'text-foreground-secondary'
            }`}
          >
            {/* Tab icons */}
            {t === 'oats' && (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            )}
            {t === 'bookmarked' && (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            )}
            {t === 'likes' && (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
            {t === 'videos' && (
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-8.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
              </svg>
            )}
            {tab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {tabLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (tab === 'oats' || tab === 'bookmarked') ? (() => {
        const list = tab === 'oats' ? oatPosts : bookmarkedOats
        const emptyTitle = tab === 'oats' ? 'No Oats yet' : 'No bookmarks yet'
        const emptyMsg = tab === 'oats'
          ? (isOwner ? "You haven't posted any Oats yet." : `@${profile.username} hasn't posted any Oats yet.`)
          : (tab === 'bookmarked' && currentUserId !== profile.id)
          ? 'Bookmarks are private.'
          : "You haven't bookmarked any Oats yet."

        return list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
            <OatsLogo className="w-12 h-12 text-foreground-secondary opacity-50" />
            <p className="text-2xl font-black text-foreground">{emptyTitle}</p>
            <p className="text-foreground-secondary text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {list.map((oat, idx) => (
              <button
                key={oat.id}
                onClick={() => openOatPlayer(oat, list, idx)}
                className="relative aspect-[9/16] bg-black overflow-hidden group focus:outline-none"
                aria-label={oat.caption || 'View oat'}
              >
                {oat.thumbnail_url ? (
                  <img
                    src={oat.thumbnail_url}
                    alt={oat.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                    <OatsLogo className="w-8 h-8 text-white/30" />
                  </div>
                )}
                {/* Always-visible view count pill at bottom-left like reference */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1.5 pt-4">
                  <div className="flex items-center gap-0.5 text-white text-[10px] font-bold drop-shadow">
                    <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {formatCount(oat.views_count) || '0'}
                  </div>
                </div>
              </button>
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
    </div>
  )
}
