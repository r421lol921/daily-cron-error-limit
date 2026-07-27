'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/format'
import type { Post, Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  post: Post
  currentProfile: Profile
  onClose: () => void
  onReplied?: () => void
}

export default function ReplyModal({ post, currentProfile, onClose, onReplied }: Props) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(false)
  // @mention autocomplete & collab
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionSuggestions, setMentionSuggestions] = useState<Profile[]>([])
  const [collabProfile, setCollabProfile] = useState<Profile | null>(null)
  const mentionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const postProfile = post.profiles

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
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
      const path = `${currentProfile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('post-media').upload(path, file, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if ((!trimmed && mediaFiles.length === 0) || loading) return
    setLoading(true)
    setUploadProgress(true)
    const mediaUrls = await uploadMedia()
    setUploadProgress(false)

    const replyExpiresAt = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()
    const supabase = createClient()
    await supabase.from('posts').insert({
      user_id: currentProfile.id,
      content: trimmed || ' ',
      media_urls: mediaUrls,
      reply_to_id: post.id,
      collab_user_id: collabProfile?.id ?? null,
      expires_at: replyExpiresAt,
    })

    setLoading(false)
    setCollabProfile(null)
    setMentionQuery(null)
    setMentionSuggestions([])
    onReplied?.()
    onClose()
  }

  const remaining = 280 - content.length
  const canPost = (content.trim().length > 0 || mediaFiles.length > 0) && content.length <= 280

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-14 px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-content bg-background w-full max-w-[600px] rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-4">
          {/* Original post preview */}
          {postProfile && (
            <div className="flex gap-3 mb-1">
              <div className="flex flex-col items-center">
                <Link href={`/profile/${postProfile.username}`} onClick={e => e.stopPropagation()}>
                  <Image
                    src={postProfile.avatar_url || DEFAULT_AVATAR}
                    alt={postProfile.display_name}
                    width={44}
                    height={44}
                    className="rounded-full w-11 h-11 object-cover"
                    unoptimized
                  />
                </Link>
                {/* Vertical connecting line */}
                <div className="w-0.5 flex-1 min-h-[32px] bg-border mt-1" />
              </div>
              <div className="flex flex-col flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-foreground text-sm">{postProfile.display_name}</span>
                  <span className="text-foreground-secondary text-sm">@{postProfile.username}</span>
                  <span className="text-foreground-secondary text-sm">·</span>
                  <span className="text-foreground-secondary text-sm">{formatDate(post.created_at)}</span>
                </div>
                <p className="text-foreground text-sm leading-relaxed mt-0.5 line-clamp-3">{post.content}</p>
                {/* Post media thumbnail */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {post.media_urls.slice(0, 2).map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {/\.(mp4|webm|ogg|mov)$/i.test(url) ? (
                          <video src={url} className="w-full h-full object-cover" muted />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                    {post.media_urls.length > 2 && (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-foreground-secondary text-xs font-bold">
                        +{post.media_urls.length - 2}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-foreground-secondary text-sm mt-2">
                  Replying to{' '}
                  <span className="text-primary">@{postProfile.username}</span>
                </p>
              </div>
            </div>
          )}

          {/* Reply composer */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <Image
                src={currentProfile.avatar_url || DEFAULT_AVATAR}
                alt={currentProfile.display_name}
                width={44}
                height={44}
                className="rounded-full w-11 h-11 object-cover"
                unoptimized
              />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-2 min-w-0">
              <div className="relative">
                <textarea
                  ref={textareaRef}
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
                  placeholder="Post your reply"
                  rows={2}
                  className="w-full bg-transparent text-xl text-foreground placeholder:text-foreground-secondary resize-none outline-none leading-relaxed"
                  style={{ minHeight: '64px', maxHeight: '200px' }}
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
                <div className={`grid gap-1 rounded-2xl overflow-hidden ${
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

              <div className="flex items-center justify-between border-t border-border pt-2">
                <div className="flex items-center gap-1 text-primary">
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
                  <button type="button" className="p-2 rounded-full hover:bg-primary/10 transition" aria-label="Emoji">
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
                    {uploadProgress ? 'Uploading...' : loading ? 'Replying...' : 'Reply'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
