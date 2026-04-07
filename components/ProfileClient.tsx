'use client'

import { useState } from 'react'
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
  const [following, setFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(initialProfile.followers_count)
  const [tab, setTab] = useState<'posts' | 'replies' | 'likes'>('posts')
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(initialProfile.display_name)
  const [editBio, setEditBio] = useState(initialProfile.bio)
  const [editLocation, setEditLocation] = useState(initialProfile.location)
  const [editWebsite, setEditWebsite] = useState(initialProfile.website)
  const [saving, setSaving] = useState(false)

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

  async function handleSaveProfile() {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .update({ display_name: editName, bio: editBio, location: editLocation, website: editWebsite, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
      .select()
      .single()
    setSaving(false)
    if (data) { setProfile(data); setEditMode(false) }
  }

  const isVerified = followers >= 199000

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
      <div className="h-36 xs:h-48 bg-muted relative">
        {profile.banner_url && (
          <Image src={profile.banner_url} alt="Banner" fill className="object-cover" unoptimized />
        )}
      </div>

      {/* Profile info */}
      <div className="px-4 pb-4 relative">
        {/* Avatar + actions */}
        <div className="flex justify-between items-end mb-3 -mt-16">
          <div className="w-24 h-24 xs:w-32 xs:h-32 rounded-full border-4 border-background overflow-hidden bg-muted flex-shrink-0">
            <Image
              src={profile.avatar_url || DEFAULT_AVATAR}
              alt={profile.display_name}
              width={128}
              height={128}
              className="w-full h-full object-cover rounded-full"
              unoptimized
            />
          </div>
          <div className="mb-2">
            {isOwner ? (
              editMode ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditMode(false)} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving} className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-bold hover:bg-foreground/90 transition disabled:opacity-60">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditMode(true)} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition">
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
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-black text-xl text-foreground">{profile.display_name}</h1>
          {isVerified && <VerifiedBadge size={20} />}
        </div>
        <p className="text-foreground-secondary text-sm mb-3">@{profile.username}</p>

        {/* Edit form */}
        {editMode && (
          <div className="flex flex-col gap-3 mb-4 p-3 border border-border rounded-xl">
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Display name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Bio</label>
              <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Location</label>
              <input value={editLocation} onChange={e => setEditLocation(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Website</label>
              <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
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

        {/* Following / Followers with Odometer */}
        <div className="flex gap-5 text-sm">
          <Link href={`/profile/${profile.username}/following`} className="flex items-center gap-1 hover:underline">
            <strong className="text-foreground font-bold">{profile.following_count}</strong>
            <span className="text-foreground-secondary">Following</span>
          </Link>
          <div className="flex items-center gap-1">
            <strong className="text-foreground font-bold flex items-center gap-0.5">
              <Odometer value={followers} />
            </strong>
            <span className="text-foreground-secondary">
              {followers === 1 ? 'Follower' : 'Followers'}
            </span>
            <span className="text-foreground-secondary text-xs ml-1">
              ({formatFollowers(followers)})
            </span>
          </div>
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

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
          <p className="text-2xl font-black text-foreground">No posts yet</p>
          <p className="text-foreground-secondary text-sm">
            {isOwner ? 'Share something with the world!' : `When @${profile.username} posts, they will appear here.`}
          </p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
          />
        ))
      )}
    </div>
  )
}
