'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Group {
  id: string
  owner_id: string
  name: string
  description: string
  avatar_url: string
  banner_url: string
  website: string
  members_count: number
  created_at: string
}

interface GroupMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  profiles: Profile
}

interface Props {
  group: Group
  members: GroupMember[]
  currentUserId: string
  currentProfile: Profile | null
  initialIsMember: boolean
  isOwner: boolean
}

export default function GroupDetailClient({ group: initialGroup, members, currentUserId, currentProfile, initialIsMember, isOwner }: Props) {
  const router = useRouter()
  const [group, setGroup] = useState(initialGroup)
  const [isMember, setIsMember] = useState(initialIsMember)
  const [memberCount, setMemberCount] = useState(initialGroup.members_count)
  const [showEdit, setShowEdit] = useState(false)
  const [editName, setEditName] = useState(initialGroup.name)
  const [editDesc, setEditDesc] = useState(initialGroup.description ?? '')
  const [editWebsite, setEditWebsite] = useState(initialGroup.website ?? '')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const editAvatarRef = useRef<HTMLInputElement>(null)
  const editBannerRef = useRef<HTMLInputElement>(null)

  async function handleJoinLeave() {
    if (!currentUserId) { router.push('/auth/login'); return }
    const supabase = createClient()
    if (isMember) {
      if (isOwner) return
      await supabase.from('group_members').delete().match({ group_id: group.id, user_id: currentUserId })
      setIsMember(false)
      setMemberCount(c => Math.max(1, c - 1))
    } else {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: currentUserId })
      setIsMember(true)
      setMemberCount(c => c + 1)
    }
  }

  async function handleSaveEdit() {
    setSaving(true)
    const supabase = createClient()
    let newAvatar = group.avatar_url
    let newBanner = group.banner_url

    if (editAvatarFile) {
      const path = `groups/${group.id}/avatar-${Date.now()}`
      const { data, error } = await supabase.storage.from('avatars').upload(path, editAvatarFile, { upsert: true })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
        newAvatar = urlData.publicUrl
      }
    }
    if (editBannerFile) {
      const path = `groups/${group.id}/banner-${Date.now()}`
      const { data, error } = await supabase.storage.from('avatars').upload(path, editBannerFile, { upsert: true })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
        newBanner = urlData.publicUrl
      }
    }

    const { data } = await supabase
      .from('groups')
      .update({ name: editName, description: editDesc, website: editWebsite, avatar_url: newAvatar, banner_url: newBanner, updated_at: new Date().toISOString() })
      .eq('id', group.id)
      .select()
      .single()

    setSaving(false)
    if (data) {
      setGroup(data)
      setShowEdit(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 py-3">
        <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground" aria-label="Back">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h2 className="font-bold text-xl text-foreground truncate">{group.name}</h2>
        {isOwner && (
          <button
            onClick={() => setShowEdit(true)}
            className="ml-auto rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition flex-shrink-0"
          >
            Edit
          </button>
        )}
      </header>

      {/* Banner */}
      <div className="relative h-36 bg-muted">
        {group.banner_url && (
          <Image src={group.banner_url} alt="" fill className="object-cover" unoptimized />
        )}
      </div>

      {/* Group info */}
      <div className="px-4 pb-4 border-b border-border">
        {/* Avatar */}
        <div className="relative -mt-8 mb-3 w-20 h-20">
          <div className="w-20 h-20 rounded-full border-4 border-background overflow-hidden bg-muted">
            <Image
              src={group.avatar_url || DEFAULT_AVATAR}
              alt={group.name}
              width={80}
              height={80}
              className="w-full h-full object-cover rounded-full"
              unoptimized
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-black text-2xl text-foreground leading-tight">{group.name}</h1>
            <p className="text-foreground-secondary text-sm mt-0.5">
              <span className="font-semibold text-foreground">{memberCount}</span> {memberCount === 1 ? 'member' : 'members'}
            </p>
            {group.description && (
              <p className="text-foreground text-sm mt-2 leading-relaxed">{group.description}</p>
            )}
            {group.website && (
              <a href={group.website} target="_blank" rel="noreferrer" className="text-primary text-sm hover:underline mt-1 block truncate">
                {group.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          {/* Join/Leave */}
          <div className="flex-shrink-0 mt-1">
            {isOwner ? (
              <span className="text-xs text-foreground-secondary font-medium">Owner</span>
            ) : isMember ? (
              <button
                onClick={handleJoinLeave}
                className="rounded-full border border-border px-5 py-2 text-sm font-bold text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition"
              >
                Leave
              </button>
            ) : (
              <button
                onClick={handleJoinLeave}
                className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-bold hover:bg-foreground/90 transition"
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-bold text-foreground text-base">Members</h3>
      </div>
      {members.map(m => (
        <Link
          key={m.id}
          href={`/profile/${m.profiles?.username}`}
          className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-foreground/[0.02] transition"
        >
          <Image
            src={m.profiles?.avatar_url || DEFAULT_AVATAR}
            alt={m.profiles?.display_name ?? ''}
            width={44}
            height={44}
            className="rounded-full w-11 h-11 object-cover flex-shrink-0"
            unoptimized
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{m.profiles?.display_name}</p>
            <p className="text-foreground-secondary text-xs">@{m.profiles?.username}</p>
          </div>
          {m.role === 'owner' && (
            <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full flex-shrink-0">Owner</span>
          )}
        </Link>
      ))}

      {/* Edit group modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
          <div className="bg-popover border border-border rounded-2xl w-full max-w-sm overflow-hidden">
            {/* Banner upload */}
            <div className="relative h-24 bg-muted">
              {(editBannerPreview || group.banner_url) && (
                <Image src={editBannerPreview || group.banner_url} alt="Banner" fill className="object-cover" unoptimized />
              )}
              <button
                onClick={() => editBannerRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/55 transition"
                type="button"
              >
                <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </div>
              </button>
              <input ref={editBannerRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setEditBannerFile(f); setEditBannerPreview(URL.createObjectURL(f)) } }} />
            </div>

            <div className="px-5 pb-5 pt-0">
              {/* Avatar upload */}
              <div className="relative w-16 h-16 -mt-8 mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-popover overflow-hidden bg-muted">
                  <Image src={editAvatarPreview || group.avatar_url || DEFAULT_AVATAR} alt="" width={64} height={64} className="w-full h-full object-cover rounded-full" unoptimized />
                </div>
                <button
                  onClick={() => editAvatarRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/55 transition"
                  type="button"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                  </svg>
                </button>
                <input ref={editAvatarRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setEditAvatarFile(f); setEditAvatarPreview(URL.createObjectURL(f)) } }} />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-foreground">Edit Group</h2>
                <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-full hover:bg-foreground/10 transition text-foreground">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Group name</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    maxLength={50}
                    className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Description</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={3}
                    maxLength={200}
                    className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Website</label>
                  <input
                    value={editWebsite}
                    onChange={e => setEditWebsite(e.target.value)}
                    maxLength={100}
                    placeholder="https://"
                    className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-5">
                <button onClick={() => setShowEdit(false)} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition">
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editName.trim()}
                  className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
