'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCount } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import PostContent from './PostContent'
import MediaViewer from './MediaViewer'
import ReplyModal from './ReplyModal'
import RepostModal from './RepostModal'
import type { Post, Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  post: Post
  currentUserId: string
  currentProfile?: Profile
  onUpdate?: (updated: Post) => void
  onReplied?: () => void
}

export default function PostCard({ post, currentUserId, currentProfile, onUpdate, onReplied }: Props) {
  const router = useRouter()
  const [liked, setLiked] = useState(post.user_liked ?? false)
  const [reposted, setReposted] = useState(post.user_reposted ?? false)
  const [saved, setSaved] = useState(post.user_saved ?? false)
  const [likes, setLikes] = useState(post.likes_count)
  const [reposts, setReposts] = useState(post.reposts_count)
  const [saves, setSaves] = useState(post.saves_count)
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [showRepostModal, setShowRepostModal] = useState(false)
  const [showLikeAnim, setShowLikeAnim] = useState(false)
  const likeButtonRef = useRef<HTMLButtonElement>(null)

  const profile = post.profiles
  const mediaUrls = post.media_urls?.filter(Boolean) ?? []
  const hasMedia = mediaUrls.length > 0

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (post.is_archived) return
    const supabase = createClient()
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: currentUserId, post_id: post.id })
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
      onUpdate?.({ ...post, likes_count: Math.max(0, likes - 1), user_liked: false })
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id })
      setLiked(true)
      setLikes(l => l + 1)
      setShowLikeAnim(true)
      setTimeout(() => setShowLikeAnim(false), 600)
      onUpdate?.({ ...post, likes_count: likes + 1, user_liked: true })
    }
  }

  async function handleRepost(e: React.MouseEvent) {
    e.stopPropagation()
    if (post.is_archived) return
    const supabase = createClient()
    if (reposted) {
      await supabase.from('reposts').delete().match({ user_id: currentUserId, post_id: post.id })
      setReposted(false)
      setReposts(r => Math.max(0, r - 1))
    } else {
      await supabase.from('reposts').insert({ user_id: currentUserId, post_id: post.id })
      setReposted(true)
      setReposts(r => r + 1)
    }
  }

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (post.is_archived) return
    const supabase = createClient()
    if (saved) {
      await supabase.from('saves').delete().match({ user_id: currentUserId, post_id: post.id })
      setSaved(false)
      setSaves(s => Math.max(0, s - 1))
    } else {
      await supabase.from('saves').insert({ user_id: currentUserId, post_id: post.id })
      setSaved(true)
      setSaves(s => s + 1)
    }
  }

  function handleCardClick() {
    router.push(`/post/${post.id}`)
  }

  function handleReplyClick(e: React.MouseEvent) {
    e.stopPropagation()
    if (!currentProfile) { router.push(`/post/${post.id}`); return }
    setShowReplyModal(true)
  }

  if (!profile) return null

  return (
    <>
      <article
        onClick={handleCardClick}
        data-post-id={post.id}
        className="flex gap-3 px-4 py-3 border-b border-border hover:bg-foreground/[0.02] transition cursor-pointer"
      >
        {/* Avatar */}
        <Link href={`/profile/${profile.username}`} onClick={e => e.stopPropagation()} className="flex-shrink-0">
          <Image
            src={profile.avatar_url || DEFAULT_AVATAR}
            alt={profile.display_name}
            width={48}
            height={48}
            className="rounded-full w-12 h-12 object-cover"
            unoptimized
          />
        </Link>

        <div className="flex flex-col flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1 flex-wrap">
            <Link
              href={`/profile/${profile.username}`}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 hover:underline min-w-0"
            >
              <span className="font-bold text-foreground truncate text-sm">{profile.display_name}</span>
              {profile.followers_count >= 199000 && <VerifiedBadge size={14} />}
            </Link>
            <Link href={`/profile/${profile.username}`} onClick={e => e.stopPropagation()} className="text-foreground-secondary text-xs truncate">
              @{profile.username}
            </Link>
            <span className="text-foreground-secondary text-xs">·</span>
            <span className="text-foreground-secondary text-xs">{formatDate(post.created_at)}</span>
            {post.is_archived && (
              <span className="ml-auto text-xs bg-muted text-foreground-secondary px-2 py-0.5 rounded-full font-medium">
                Archived
              </span>
            )}
          </div>

          {/* Content */}
          <PostContent content={post.content} className="mt-1 text-foreground text-sm leading-normal" />

          {/* Media grid */}
          {hasMedia && (
            <div
              className={`mt-3 grid gap-1 rounded-2xl overflow-hidden border border-border/50 ${
                mediaUrls.length === 1 ? 'grid-cols-1' :
                mediaUrls.length === 2 ? 'grid-cols-2' :
                mediaUrls.length === 3 ? 'grid-cols-2' : 'grid-cols-2'
              }`}
              onClick={e => e.stopPropagation()}
            >
              {mediaUrls.map((url, i) => {
                const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url) || url.includes('video')
                const isOdd = mediaUrls.length === 3 && i === 0
                return (
                  <div
                    key={i}
                    className={`relative overflow-hidden cursor-pointer bg-muted ${isOdd ? 'col-span-2' : ''}`}
                    style={{ aspectRatio: mediaUrls.length === 1 ? '16/9' : '1/1' }}
                    onClick={() => setMediaViewerIndex(i)}
                  >
                    {isVideo ? (
                      <video src={url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="Post media" className="w-full h-full object-cover" />
                    )}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-6 h-6 text-white ml-0.5" fill="currentColor">
                            <path d="M5 3l14 9-14 9V3z" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 max-w-[425px] text-foreground-secondary">
            {/* Reply */}
            <button
              onClick={handleReplyClick}
              className="action-btn group relative flex items-center gap-2 hover:text-primary transition"
              aria-label="Reply"
            >
              <span className="p-2 rounded-full group-hover:bg-primary/10 transition">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                </svg>
              </span>
              <span className="action-tooltip">Reply</span>
            </button>

            {/* Repost */}
            <button
              onClick={e => { e.stopPropagation(); setShowRepostModal(true) }}
              className={`action-btn group relative flex items-center gap-2 hover:text-green-500 transition ${reposted ? 'text-green-500' : ''}`}
              aria-label="Repost"
            >
              <span className="p-2 rounded-full group-hover:bg-green-500/10 transition">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
              </span>
              {reposts > 0 && <span className="text-xs tabular-nums">{formatCount(reposts)}</span>}
              <span className="action-tooltip">{reposted ? 'Undo repost' : 'Repost'}</span>
            </button>

            {/* Like */}
            <button
              ref={likeButtonRef}
              onClick={handleLike}
              className={`action-btn group relative flex items-center gap-2 hover:text-pink-500 transition ${liked ? 'text-pink-500' : ''}`}
              aria-label="Like"
            >
          <span className="relative p-2 rounded-full group-hover:bg-pink-500/10 transition">
              {/* Bubble ring on like */}
              {showLikeAnim && (
                <span className="like-bubble text-pink-500" aria-hidden="true" />
              )}
              <svg
                viewBox="0 0 24 24"
                className={`w-[18px] h-[18px] ${showLikeAnim ? 'like-jiggle' : ''}`}
                fill={liked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              </span>
              {likes > 0 && <span className="text-xs tabular-nums">{formatCount(likes)}</span>}
              <span className="action-tooltip">{liked ? 'Unlike' : 'Like'}</span>
            </button>

            {/* Stats (was views) */}
            <button
              onClick={e => { e.stopPropagation(); router.push(`/stats/${post.id}`) }}
              className="action-btn group relative flex items-center gap-2 hover:text-primary transition"
              aria-label="Stats"
            >
              <span className="p-2 rounded-full group-hover:bg-primary/10 transition">
                {/* Eye / views icon */}
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              {post.views_count > 0 && <span className="text-xs tabular-nums">{formatCount(post.views_count)}</span>}
              <span className="action-tooltip">View stats</span>
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              className={`action-btn group relative flex items-center gap-2 hover:text-primary transition ${saved ? 'text-primary' : ''}`}
              aria-label="Save"
            >
              <span className="p-2 rounded-full group-hover:bg-primary/10 transition">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </span>
              {saves > 0 && <span className="text-sm tabular-nums">{formatCount(saves)}</span>}
              <span className="action-tooltip">{saved ? 'Unsave' : 'Save'}</span>
            </button>
          </div>
        </div>
      </article>

      {/* Media viewer */}
      {mediaViewerIndex !== null && (
        <MediaViewer
          urls={mediaUrls}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerIndex(null)}
        />
      )}

      {/* Reply modal */}
      {showReplyModal && currentProfile && (
        <ReplyModal
          post={post}
          currentProfile={currentProfile}
          onClose={() => setShowReplyModal(false)}
          onReplied={() => { setShowReplyModal(false); onReplied?.() }}
        />
      )}

      {/* Repost modal */}
      {showRepostModal && (
        <RepostModal
          post={post}
          reposted={reposted}
          onClose={() => setShowRepostModal(false)}
          onConfirm={async () => {
            // Synthetic event workaround
            const supabase = (await import('@/lib/supabase/client')).createClient()
            if (reposted) {
              await supabase.from('reposts').delete().match({ user_id: currentUserId, post_id: post.id })
              setReposted(false)
              setReposts(r => Math.max(0, r - 1))
              onUpdate?.({ ...post, reposts_count: Math.max(0, reposts - 1), user_reposted: false })
            } else {
              await supabase.from('reposts').insert({ user_id: currentUserId, post_id: post.id })
              setReposted(true)
              setReposts(r => r + 1)
              onUpdate?.({ ...post, reposts_count: reposts + 1, user_reposted: true })
            }
          }}
        />
      )}
    </>
  )
}
