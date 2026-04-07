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

interface Props {
  groups: Group[]
  currentUserId: string
  currentProfile: Profile | null
  ownedGroupIds: string[]
  memberGroupIds: string[]
}

function formatMemberCount(n: number): string {
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toString()
}

export default function GroupsClient({ groups: initialGroups, currentUserId, currentProfile, ownedGroupIds, memberGroupIds }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [ownedIds, setOwnedIds] = useState(new Set(ownedGroupIds))
  const [memberIds, setMemberIds] = useState(new Set(memberGroupIds))
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  // Edit modal
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editWebsite, setEditWebsite] = useState('')
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null)
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null)
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [editBannerPreview, setEditBannerPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const editAvatarRef = useRef<HTMLInputElement>(null)
  const editBannerRef = useRef<HTMLInputElement>(null)

  const canCreate = !Array.from(ownedIds).some(id => id)

  async function handleCreate() {
    if (!newName.trim() || !currentUserId) return
    // Check if user already owns a group
    if (ownedIds.size > 0) return
    setCreating(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('groups')
      .insert({ owner_id: currentUserId, name: newName.trim(), description: newDesc.trim() })
      .select()
      .single()
    setCreating(false)
    if (data) {
      setGroups(prev => [data, ...prev])
      setOwnedIds(prev => new Set([...prev, data.id]))
      // Auto-join as member
      await supabase.from('group_members').insert({ group_id: data.id, user_id: currentUserId })
      setMemberIds(prev => new Set([...prev, data.id]))
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    }
  }

  async function handleJoinLeave(group: Group) {
    if (!currentUserId) { router.push('/auth/login'); return }
    const supabase = createClient()
    if (memberIds.has(group.id)) {
      // Leave (but owners can't leave their own group)
      if (ownedIds.has(group.id)) return
      await supabase.from('group_members').delete().match({ group_id: group.id, user_id: currentUserId })
      setMemberIds(prev => { const s = new Set(prev); s.delete(group.id); return s })
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members_count: Math.max(1, g.members_count - 1) } : g))
    } else {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: currentUserId })
      setMemberIds(prev => new Set([...prev, group.id]))
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, members_count: g.members_count + 1 } : g))
    }
  }

  async function handleDelete(groupId: string) {
    const supabase = createClient()
    await supabase.from('groups').delete().eq('id', groupId)
    setGroups(prev => prev.filter(g => g.id !== groupId))
    setOwnedIds(prev => { const s = new Set(prev); s.delete(groupId); return s })
    setMemberIds(prev => { const s = new Set(prev); s.delete(groupId); return s })
  }

  function openEdit(group: Group) {
    setEditingGroup(group)
    setEditName(group.name)
    setEditDesc(group.description)
    setEditWebsite(group.website)
    setEditAvatarFile(null)
    setEditBannerFile(null)
    setEditAvatarPreview(null)
    setEditBannerPreview(null)
  }

  async function handleSaveEdit() {
    if (!editingGroup) return
    setSaving(true)
    const supabase = createClient()
    let newAvatar = editingGroup.avatar_url
    let newBanner = editingGroup.banner_url

    if (editAvatarFile) {
      const path = `groups/${editingGroup.id}/avatar-${Date.now()}`
      const { data, error } = await supabase.storage.from('avatars').upload(path, editAvatarFile, { upsert: true })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
        newAvatar = urlData.publicUrl
      }
    }
    if (editBannerFile) {
      const path = `groups/${editingGroup.id}/banner-${Date.now()}`
      const { data, error } = await supabase.storage.from('avatars').upload(path, editBannerFile, { upsert: true })
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
        newBanner = urlData.publicUrl
      }
    }

    const { data } = await supabase
      .from('groups')
      .update({ name: editName, description: editDesc, website: editWebsite, avatar_url: newAvatar, banner_url: newBanner, updated_at: new Date().toISOString() })
      .eq('id', editingGroup.id)
      .select()
      .single()
    setSaving(false)
    if (data) {
      setGroups(prev => prev.map(g => g.id === data.id ? data : g))
      setEditingGroup(null)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <h1 className="font-bold text-xl text-foreground">Groups</h1>
        </div>
        {/* Create button — only if user has no group */}
        {ownedIds.size === 0 && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-bold hover:bg-primary/90 transition"
          >
            Create Group
          </button>
        )}
      </header>

      {/* Create group modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-popover border border-border rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4 modal-content">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">Create a Group</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-full hover:bg-foreground/10 transition text-foreground">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Group name</label>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  maxLength={50}
                  placeholder="Name your group"
                  className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Description</label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  maxLength={200}
                  placeholder="What is this group about?"
                  className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit group modal */}
      {editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
          <div className="bg-popover border border-border rounded-2xl w-full max-w-sm p-0 overflow-hidden modal-content">
            {/* Banner */}
            <div className="relative h-24 bg-muted">
              {(editBannerPreview || editingGroup.banner_url) && (
                <Image src={editBannerPreview || editingGroup.banner_url} alt="Banner" fill className="object-cover" unoptimized />
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
              <input ref={editBannerRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) { setEditBannerFile(f); setEditBannerPreview(URL.createObjectURL(f)) } }} />
            </div>

            <div className="px-5 pb-5 pt-0">
              {/* Avatar */}
              <div className="relative w-16 h-16 -mt-8 mb-3">
                <div className="w-16 h-16 rounded-full border-4 border-popover overflow-hidden bg-muted">
                  <Image src={editAvatarPreview || editingGroup.avatar_url || DEFAULT_AVATAR} alt="" width={64} height={64} className="w-full h-full object-cover rounded-full" unoptimized />
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
                <input ref={editAvatarRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if(f) { setEditAvatarFile(f); setEditAvatarPreview(URL.createObjectURL(f)) } }} />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg text-foreground">Edit Group</h2>
                <button onClick={() => setEditingGroup(null)} className="p-1.5 rounded-full hover:bg-foreground/10 transition text-foreground">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Group name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={50} className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Description</label>
                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} maxLength={200} className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Website</label>
                  <input value={editWebsite} onChange={e => setEditWebsite(e.target.value)} maxLength={100} placeholder="https://" className="w-full input-squared bg-background border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setEditingGroup(null)} className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:bg-foreground/10 transition">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving || !editName.trim()} className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-bold hover:bg-foreground/90 transition disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-2xl font-black text-foreground">No groups yet</p>
          <p className="text-foreground-secondary text-sm">Be the first to create a group.</p>
        </div>
      ) : (
        <div>
          {groups.map(group => {
            const isOwner = ownedIds.has(group.id)
            const isMember = memberIds.has(group.id)
            return (
              <div key={group.id} className="border-b border-border">
                {/* Group banner — clickable */}
                <Link href={`/groups/${group.id}`}>
                  {group.banner_url && (
                    <div className="relative h-24 bg-muted overflow-hidden">
                      <Image src={group.banner_url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </Link>
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar — clickable */}
                    <Link href={`/groups/${group.id}`} className="flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden border-2 border-background">
                        <Image
                          src={group.avatar_url || DEFAULT_AVATAR}
                          alt={group.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover rounded-full"
                          unoptimized
                        />
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/groups/${group.id}`} className="hover:underline">
                            <p className="font-bold text-foreground leading-tight truncate">{group.name}</p>
                          </Link>
                          <p className="text-foreground-secondary text-xs mt-0.5">
                            <span className="font-semibold text-foreground">{formatMemberCount(group.members_count)}</span> {group.members_count === 1 ? 'member' : 'members'}
                          </p>
                          {group.description && (
                            <p className="text-foreground-secondary text-sm mt-1 line-clamp-2">{group.description}</p>
                          )}
                          {group.website && (
                            <a href={group.website} target="_blank" rel="noreferrer" className="text-primary text-xs hover:underline mt-0.5 block truncate" onClick={e => e.stopPropagation()}>
                              {group.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </div>
                        {/* Owner 3-dot menu */}
                        {isOwner && (
                          <GroupMenu
                            onEdit={() => openEdit(group)}
                            onDelete={() => handleDelete(group.id)}
                          />
                        )}
                      </div>

                      {/* Join / Leave button */}
                      <div className="mt-3">
                        {isOwner ? (
                          <span className="text-xs text-foreground-secondary font-medium">You own this group</span>
                        ) : isMember ? (
                          <button
                            onClick={() => handleJoinLeave(group)}
                            className="rounded-full border border-border px-4 py-1.5 text-sm font-bold text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10 transition"
                          >
                            Leave
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJoinLeave(group)}
                            className="rounded-full bg-foreground text-background px-4 py-1.5 text-sm font-bold hover:bg-foreground/90 transition"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GroupMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1.5 rounded-full hover:bg-foreground/10 transition text-foreground-secondary"
        aria-label="Group options"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-40 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden w-44">
            <button
              onClick={() => { setOpen(false); onEdit() }}
              className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-foreground/10 transition flex items-center gap-3"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit group
            </button>
            <button
              onClick={() => { setOpen(false); onDelete() }}
              className="w-full text-left px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition flex items-center gap-3"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Delete group
            </button>
          </div>
        </>
      )}
    </div>
  )
}
