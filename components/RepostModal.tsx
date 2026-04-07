'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { formatDate } from '@/lib/format'
import PostContent from './PostContent'
import type { Post } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  post: Post
  reposted: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function RepostModal({ post, reposted, onClose, onConfirm }: Props) {
  const profile = post.profiles

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!profile) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="modal-content bg-background w-full max-w-[480px] rounded-2xl shadow-2xl border border-border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <span className="font-bold text-foreground text-base">
            {reposted ? 'Undo Repost?' : 'Repost?'}
          </span>
          <div className="w-9" />
        </div>

        {/* Post preview */}
        <div className="px-4 py-4">
          <div className="border border-border rounded-2xl p-3 mb-4">
            <div className="flex gap-3">
              <Link href={`/profile/${profile.username}`} onClick={e => e.stopPropagation()}>
                <Image
                  src={profile.avatar_url || DEFAULT_AVATAR}
                  alt={profile.display_name}
                  width={40}
                  height={40}
                  className="rounded-full w-10 h-10 object-cover flex-shrink-0"
                  unoptimized
                />
              </Link>
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-bold text-foreground text-sm">{profile.display_name}</span>
                  <span className="text-foreground-secondary text-xs">@{profile.username}</span>
                  <span className="text-foreground-secondary text-xs">·</span>
                  <span className="text-foreground-secondary text-xs">{formatDate(post.created_at)}</span>
                </div>
                <PostContent content={post.content} className="mt-1 text-foreground text-sm leading-normal line-clamp-4" />
                {post.media_urls && post.media_urls.filter(Boolean).length > 0 && (
                  <div className="mt-2 flex gap-1.5">
                    {post.media_urls.filter(Boolean).slice(0, 2).map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                        {/\.(mp4|webm|ogg|mov)$/i.test(url) ? (
                          <video src={url} className="w-full h-full object-cover" muted />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    ))}
                    {post.media_urls.filter(Boolean).length > 2 && (
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-foreground-secondary text-xs font-bold">
                        +{post.media_urls.filter(Boolean).length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-border py-2.5 font-bold text-foreground text-sm transition hover:bg-foreground/5 active:bg-foreground/10"
            >
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(); onClose() }}
              className={`flex-1 rounded-full py-2.5 font-bold text-sm transition flex items-center justify-center gap-2 ${
                reposted
                  ? 'border border-destructive text-destructive hover:bg-destructive/10'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
              </svg>
              {reposted ? 'Undo Repost' : 'Repost'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
