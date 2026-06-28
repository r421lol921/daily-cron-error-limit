'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import ClipVideoPlayer from './ClipVideoPlayer'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile
  onClose: () => void
  onPosted?: () => void
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export default function OatUploadModal({ profile, onClose, onPosted }: Props) {
  const [caption, setCaption] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a video file.')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg('Video must be under 500 MB.')
      return
    }
    setErrorMsg('')
    setVideoFile(file)
    setVideoPreview(URL.createObjectURL(file))
    setUploadState('idle')
    // Auto-focus caption
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  function removeVideo() {
    setVideoFile(null)
    setVideoPreview(null)
    setUploadState('idle')
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!videoFile || uploadState === 'uploading') return

    setUploadState('uploading')
    setUploadProgress(0)
    setErrorMsg('')

    try {
      const supabase = createClient()
      const ext = videoFile.name.split('.').pop() || 'mp4'
      const path = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      // Upload video to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('oat-videos')
        .upload(path, videoFile, { upsert: true, contentType: videoFile.type })

      if (uploadError) throw uploadError

      setUploadProgress(80)

      const { data: urlData } = supabase.storage
        .from('oat-videos')
        .getPublicUrl(path)

      // Insert oat row — set expires_at 30 hours from now so the cleanup cron removes it
      const expiresAt = new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString()
      const { error: insertError } = await supabase
        .from('oats')
        .insert({
          user_id: profile.id,
          caption: caption.trim(),
          video_url: urlData.publicUrl,
          thumbnail_url: null,
          expires_at: expiresAt,
        })

      if (insertError) throw insertError

      setUploadProgress(100)
      setUploadState('done')

      // Kick off the simulation engine so views start rolling in immediately
      fetch('/api/simulate', { method: 'POST' }).catch(() => {})

      setTimeout(() => {
        onPosted?.()
        onClose()
      }, 600)
    } catch (err: unknown) {
      setUploadState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed. Try again.')
    }
  }

  const canPost = !!videoFile && uploadState !== 'uploading' && uploadState !== 'done'
  const remaining = 150 - caption.length

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-8 px-4 pb-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-[560px] rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="font-bold text-foreground text-base">New Clip</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
          <div className="flex gap-3 px-4 py-4">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Image
                src={profile.avatar_url || DEFAULT_AVATAR}
                alt={profile.display_name}
                width={44}
                height={44}
                className="rounded-full w-11 h-11 object-cover"
                unoptimized
              />
            </div>

            <div className="flex flex-col flex-1 gap-3 min-w-0">
              {/* Video picker / preview */}
              {!videoFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 w-full rounded-2xl border-2 border-dashed border-border hover:border-primary/60 hover:bg-primary/5 transition text-foreground-secondary py-12 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-primary" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground text-sm">Tap to select a video</p>
                    <p className="text-xs text-foreground-secondary mt-0.5">MP4, MOV, WebM — up to 500 MB</p>
                  </div>
                </button>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] max-h-[360px] w-full">
                  <ClipVideoPlayer
                    src={videoPreview!}
                    muted={true}
                    autoPlay={false}
                    className="w-full h-full"
                  />
                  {/* Remove video button */}
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition"
                    aria-label="Remove video"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  {/* File info chip */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-white text-xs font-medium">
                    {videoFile.name.length > 24 ? videoFile.name.slice(0, 22) + '…' : videoFile.name}
                    {' · '}
                    {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>
              )}

              {/* Caption */}
              <textarea
                ref={textareaRef}
                value={caption}
                onChange={e => setCaption(e.target.value.slice(0, 150))}
                placeholder="Add a caption..."
                rows={2}
                className="w-full bg-transparent text-lg text-foreground placeholder:text-foreground-secondary resize-none outline-none leading-relaxed"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />

              {/* Error */}
              {errorMsg && (
                <p className="text-sm text-destructive font-medium">{errorMsg}</p>
              )}

              {/* Upload progress bar */}
              {uploadState === 'uploading' && (
                <div className="w-full h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border flex-shrink-0 mt-auto">
            <div className="flex items-center gap-1 text-primary">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-full hover:bg-primary/10 transition"
                aria-label="Select video"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {caption.length > 0 && (
                <span className={`text-sm font-medium ${remaining < 0 ? 'text-destructive' : remaining < 20 ? 'text-yellow-500' : 'text-foreground-secondary'}`}>
                  {remaining}
                </span>
              )}
              <button
                type="submit"
                disabled={!canPost}
                className="rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground text-sm transition hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50 flex items-center gap-2"
              >
                {uploadState === 'uploading' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Uploading...
                  </>
                ) : uploadState === 'done' ? (
                  'Posted!'
                ) : (
                  'Post Clip'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
