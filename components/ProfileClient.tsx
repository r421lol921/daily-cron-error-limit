'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatFollowers, formatJoinDate } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import Odometer from './Odometer'
import PostCard from './PostCard'
import type { Post, Profile } from '@/lib/types'

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
  const [posts, setPosts] = useState(initialPosts)
  const [repliesPosts, setRepliesPosts] = useState<Post[]>([])
  const [likedPosts, setLikedPosts] = useState<Post[]>([])
  const [tabLoading, setTabLoading] = useState(false)
  const [following, setFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(initialProfile.followers_count)
  const [tab, setTab] = useState<'posts' | 'replies' | 'likes'>('posts')

  // Edit profile modal state
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(initialProfile.display_name)
  const [editBio, setEditBio] = useState(initialProfile.bio)
  const [editLocation, setEditLocation] = useState(initialProfile.location)
  const [editWebsite, setEditWebsite] = useState(initialProfile.website)
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const loadTabData = useCallback(async (t: 'posts' | 'replies' | 'likes') => {
    const supabase = createClient()
    setTabLoading(true)
    if (t === 'replies') {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .eq('user_id', initialProfile.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setRepliesPosts((data as Post[]) || [])
    } else if (t === 'likes') {
      const { data } = await supabase
        .from('likes')
        .select('post_id, posts(*, profiles!posts_user_id_fkey(*))')
        .eq('user_id', initialProfile.id)
        .order('created_at', { ascending: false })
        .limit(50)
      const liked = (data || []).map((row: any) => row.posts).filter(Boolean)
      setLikedPosts(liked as Post[])
    }
    setTabLoading(false)
  }, [initialProfile.id])

  useEffect(() => {
    if (tab === 'replies' && repliesPosts.length === 0) loadTabData('replies')
    if (tab === 'likes' && likedPosts.length === 0) loadTabData('likes')
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

  async function uploadFile(file: File, path: string): Promise<string | null> {
    const supabase = createClient()
    const { data, error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (error) {
      // Fallback: try to get public URL even on error (bucket may not exist yet)
      return null
    }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
    return urlData.publicUrl
  }

  async function handleSaveProfile() {
    setSaving(true)
    const supabase = createClient()
    let newAvatarUrl = profile.avatar_url
    let newBannerUrl = profile.banner_url

    // Upload avatar if changed
    if (avatarFile) {
      const url = await uploadFile(avatarFile, `${profile.id}/avatar-${Date.now()}`)
      if (url) newAvatarUrl = url
    }

    // Upload banner if changed
    if (bannerFile) {
      const url = await uploadFile(bannerFile, `${profile.id}/banner-${Date.now()}`)
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
  }

  const isVerified = followers >= 199000
  const displayAvatar = avatarPreview || profile.avatar_url || DEFAULT_AVATAR
  const displayBanner = bannerPreview || profile.banner_url

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-4 px-4 py-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <div className="flex items-center gap-1">
            <h2 className="font-bold text-xl text-foreground leading-tight">{profile.display_name}</h2>
            {isVerified && <VerifiedBadge size={18} />}
          </div>
          <p className="text-foreground-secondary text-xs">{profile.posts_count} posts</p>
        </div>
      </header>

      {/* Banner */}
      <div className="h-36 xs:h-48 bg-muted relative overflow-hidden">
        {displayBanner && (
          <Image src={displayBanner} alt="Banner" fill className="object-cover" unoptimized />
        )}
        {/* Banner upload overlay (edit mode) */}
        {editMode && (
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition group"
            type="button"
            aria-label="Change banner"
          >
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
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
            <div className="w-24 h-24 xs:w-32 xs:h-32 rounded-full border-4 border-background overflow-hidden bg-muted flex-shrink-0">
              <Image
                src={displayAvatar}
                alt={profile.display_name}
                width={128}
                height={128}
                className="w-full h-full object-cover rounded-full"
                unoptimized
              />
            </div>
            {/* Avatar upload overlay (edit mode) */}
            {editMode && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 transition"
                type="button"
                aria-label="Change avatar"
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Action buttons — pushed down from header with mt */}
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
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition"
                >
                  Edit profile
                </button>
              )
            ) : (
              <button
                onClick={handleFollow}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  following
                    ? 'border border-border text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>

        {/* Name and username */}
        <div className="flex items-center gap-2 mb-0.5">
          <h1 className="font-black text-xl text-foreground">{profile.display_name}</h1>
          {isVerified && <VerifiedBadge size={20} />}
        </div>
        <p className="text-foreground-secondary text-sm mb-3">@{profile.username}</p>

        {/* Edit form modal-style */}
        {editMode && (
          <div className="flex flex-col gap-3 mb-4 p-4 border border-border rounded-2xl bg-background-secondary">
            <p className="font-bold text-foreground text-base">Edit profile</p>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Display name</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                maxLength={50}
                className="input-squared"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Bio</label>
              <textarea
                value={editBio}
                onChange={e => setEditBio(e.target.value)}
                rows={3}
                maxLength={160}
                className="input-squared resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Location</label>
              <input
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
                maxLength={30}
                className="input-squared"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Website</label>
              <input
                value={editWebsite}
                onChange={e => setEditWebsite(e.target.value)}
                maxLength={100}
                placeholder="https://"
                className="input-squared"
              />
            </div>
          </div>
        )}

        {/* Bio */}
        {profile.bio && !editMode && <p className="text-foreground text-sm leading-relaxed mb-3">{profile.bio}</p>}

        {/* Meta */}
        {!editMode && (
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

        {/* Following / Followers */}
        <div className="flex gap-5 text-sm">
          <Link href={`/profile/${profile.username}/following`} className="flex items-center gap-1 hover:underline">
            <strong className="text-foreground font-bold">{profile.following_count}</strong>
            <span className="text-foreground-secondary">Following</span>
          </Link>
              <button className="flex items-center gap-1 hover:underline cursor-default">
                <strong className="text-foreground font-bold flex items-center gap-0.5">
                  <Odometer value={followers} />
                </strong>
                <span className="text-foreground-secondary">
                  {followers === 1 ? 'Follower' : 'Followers'}
                </span>
              </button>
        </div>
      </div>

      {/* Profile tabs */}
      <nav className="flex border-b border-border">
        {(['posts', 'replies', 'likes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-4 text-sm font-bold capitalize transition hover:bg-foreground/5 relative ${
              tab === t ? 'text-foreground' : 'text-foreground-secondary'
            }`}
          >
            {t === 'posts' ? 'Posts' : t === 'replies' ? 'Posts & replies' : 'Likes'}
            {tab === t && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-full" />}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {tabLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (() => {
        const activePosts = tab === 'posts' ? posts : tab === 'replies' ? repliesPosts : likedPosts
        const emptyMsg = tab === 'posts'
          ? (isOwner ? 'Share something with the world!' : `When @${profile.username} posts, they will appear here.`)
          : tab === 'replies'
          ? 'No posts or replies yet.'
          : (isOwner ? "You haven't liked any posts yet." : `@${profile.username} hasn't liked anything yet.`)
        return activePosts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
            <p className="text-2xl font-black text-foreground">
              {tab === 'posts' ? 'No posts yet' : tab === 'replies' ? 'No posts yet' : 'No likes yet'}
            </p>
            <p className="text-foreground-secondary text-sm">{emptyMsg}</p>
          </div>
        ) : (
          <div>
            {activePosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                currentProfile={isOwner ? profile : undefined}
                onUpdate={updated => {
                  if (tab === 'posts') setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
                  else if (tab === 'replies') setRepliesPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
                  else setLikedPosts(prev => prev.map(p => p.id === updated.id ? updated : p))
                }}
              />
            ))}
          </div>
        )
      })()}
    </div>
  )
}
