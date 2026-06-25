'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile
  onPosted?: () => void
}

export default function PostComposer({ profile, onPosted }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  // @mention autocomplete & collab
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([])
  const [collabProfile, setCollabProfile] = useState<Profile | null>(null)
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 4 - mediaFiles.length)
    if (!files.length) return
    const newFiles = [...mediaFiles, ...files].slice(0, 4)
    setMediaFiles(newFiles)
    setMediaPreviews(newFiles.map(f => URL.createObjectURL(f)))
  }

  function removeMedia(i: number) {
    setMediaFiles(f => f.filter((_, idx) => idx !== i))
    setMediaPreviews(p => p.filter((_, idx) => idx !== i))
  }

  // Detect @username at cursor for autocomplete suggestions
  const detectMentionForSuggestions = useCallback((val: string, cursorPos: number) => {
    const textBefore = val.slice(0, cursorPos)
    const match = textBefore.match(/@([A-Za-z0-9_]*)$/)
    if (match) {
      const q = match[1]
      setMentionQuery(q)
      if (mentionDebounceRef.current) clearTimeout(mentionDebounceRef.current)
      mentionDebounceRef.current = setTimeout(async () => {
        if (!q) { setMentionSuggestions([]); return }
        const supabase = createClient()
        const { data } = await supabase
          .from('profiles')
          .select('id,username,display_name,avatar_url,is_verified')
          .ilike('username', `${q}%`)
          .limit(5)
        setMentionSuggestions((data as Profile[]) ?? [])
      }, 250)
    } else {
      setMentionQuery(null)
      setMentionSuggestions([])
    }
  }, [])

  function insertMention(username: string) {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart ?? content.length
    const before = content.slice(0, pos)
    const after = content.slice(pos)
    // Replace the partial @mention with the full one
    const newBefore = before.replace(/@([A-Za-z0-9_]*)$/, `@${username} `)
    const newContent = newBefore + after
    setContent(newContent)
    setMentionQuery(null)
    setMentionSuggestions([])
    
    // Look up and set the collab profile
    setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', username)
        .limit(1)
        .single()
      if (data) setCollabProfile(data as Profile)
      
      el.focus()
      el.setSelectionRange(newBefore.length, newBefore.length)
      autoResize()
    }, 0)
  }

  async function uploadMedia(): Promise<string[]> {
    if (mediaFiles.length === 0) return []
    const supabase = createClient()
    const urls: string[] = []
    for (const file of mediaFiles) {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('post-media').upload(path, file, { upsert: true })
      if (error) {
        throw new Error(`Failed to upload ${file.name}: ${error.message}`)
      }
      const { data } = supabase.storage.from('post-media').getPublicUrl(path)
      urls.push(data.publicUrl)
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if ((!trimmed && mediaFiles.length === 0) || loading) return
    setLoading(true)
    setUploadProgress(true)
    setUploadError(null)

    let mediaUrls: string[] = []
    try {
      mediaUrls = await uploadMedia()
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed')
      setUploadProgress(false)
      setLoading(false)
      return
    }
    setUploadProgress(false)

    const supabase = createClient()
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: profile.id,
        content: trimmed || ' ',
        media_urls: mediaUrls,
        collab_user_id: collabProfile?.id ?? null,
      })
      .select()
      .single()

    if (!error && post) {
      const tags = [...new Set([...trimmed.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase()))]
      for (const tag of tags) {
        const { data: ht } = await supabase
          .from('hashtags')
          .upsert({ tag }, { onConflict: 'tag' })
          .select('id')
          .single()
        if (ht) {
          await supabase.from('post_hashtags').insert({ post_id: post.id, hashtag_id: ht.id })
          await supabase.rpc('increment_hashtag', { tag_name: tag }).maybeSingle()
        }
      }

      // PeytO Gems: +10 gems and +1 level per post
      const newGems = (profile.gem_count ?? 0) + 10
      const newLevel = (profile.level ?? 0) + 1
      await supabase
        .from('profiles')
        .update({ gem_count: newGems, level: newLevel })
        .eq('id', profile.id)
    }

    setLoading(false)
    setContent('')
    setMediaFiles([])
    setMediaPreviews([])
    setCollabProfile(null)
    setMentionQuery(null)
    setMentionSuggestions([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    onPosted?.()
  }

  const remaining = 280 - content.length
  const canPost = (content.trim().length > 0 || mediaFiles.length > 0) && content.length <= 280

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 px-4 py-3 border-b border-border">
      <div className="flex-shrink-0">
        <Image
          src={profile.avatar_url || DEFAULT_AVATAR}
          alt={profile.display_name}
          width={48}
          height={48}
          className="rounded-full w-12 h-12 object-cover"
          unoptimized
        />
      </div>
      <div className="flex flex-col flex-1 gap-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="post-composer"
            value={content}
            onChange={e => {
              setContent(e.target.value)
              autoResize()
              detectMentionForSuggestions(e.target.value, e.target.selectionStart ?? e.target.value.length)
            }}
            onKeyUp={e => {
              const el = e.currentTarget
              detectMentionForSuggestions(el.value, el.selectionStart ?? el.value.length)
            }}
            placeholder="What is happening?!"
            rows={1}
            className="w-full bg-transparent text-xl text-foreground placeholder:text-foreground-secondary resize-none outline-none min-h-[28px] leading-relaxed"
            style={{ height: '28px' }}
          />
          {/* @mention suggestions dropdown */}
          {mentionSuggestions.length > 0 && mentionQuery !== null && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-background border border-border rounded-xl shadow-xl overflow-hidden w-72">
              {mentionSuggestions.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); insertMention(p.username) }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-foreground/5 transition text-left"
                >
                  <Image
                    src={p.avatar_url || DEFAULT_AVATAR}
                    alt={p.display_name || p.username}
                    width={36}
                    height={36}
                    className="rounded-full w-9 h-9 object-cover flex-shrink-0"
                    unoptimized
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">{p.display_name || p.username}</span>
                    <span className="text-xs text-foreground-secondary">@{p.username}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Media previews */}
        {mediaPreviews.length > 0 && (
          <div className={`grid gap-1.5 rounded-2xl overflow-hidden border border-border/40 ${
            mediaPreviews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}>
            {mediaPreviews.map((src, i) => {
              const isVideo = mediaFiles[i]?.type.startsWith('video')
              const isOdd = mediaPreviews.length === 3 && i === 0
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-muted rounded-xl ${isOdd ? 'col-span-2' : ''}`}
                  style={{ aspectRatio: mediaPreviews.length === 1 ? '16/9' : '1/1' }}
                >
                  {isVideo ? (
                    <video src={src} className="w-full h-full object-cover" muted />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition"
                    aria-label="Remove media"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{uploadError}</p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2 text-primary">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={mediaFiles.length >= 4}
              className="p-2 rounded-full hover:bg-primary/10 transition disabled:opacity-40"
              aria-label="Add media"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
            <button type="button" className="p-2 rounded-full hover:bg-primary/10 transition" aria-label="Add GIF">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="6" width="18" height="12" rx="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2.5m0 0V9m0 3v3M13 9h3a1 1 0 011 1v2a1 1 0 01-1 1h-2v1" />
              </svg>
            </button>
            <button type="button" className="p-2 rounded-full hover:bg-primary/10 transition" aria-label="Add emoji">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-3">
            {content.length > 0 && (
              <span className={`text-sm font-medium ${remaining < 0 ? 'text-destructive' : remaining < 20 ? 'text-yellow-500' : 'text-foreground-secondary'}`}>
                {remaining}
              </span>
            )}
            <button
              type="submit"
              disabled={!canPost || loading}
              className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground text-sm transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50"
            >
              {uploadProgress ? 'Uploading...' : loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
