'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatCount } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import GemBadge from './GemBadge'
import PostContent from './PostContent'
import FormattedOdometer from './FormattedOdometer'
import MediaViewer from './MediaViewer'
import ReplyModal from './ReplyModal'
import RepostModal from './RepostModal'
import ShareModal from './ShareModal'
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
  const [showShareModal, setShowShareModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [visible, setVisible] = useState(false)
  const articleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = articleRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const profile = post.profiles
  const mediaUrls = post.media_urls?.filter(Boolean) ?? []
  const hasMedia = mediaUrls.length > 0
  const isReposted = post.user_reposted ?? false

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (post.is_archived) return
    const supabase = createClient()
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: currentUserId, post_id: post.id })
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id })
      setLiked(true)
      setLikes(l => l + 1)
    }
  }

  async function handleRepost(e: React.MouseEvent) {
    e.stopPropagation()
    if (post.is_archived) return
    const supabase = createClient()
    if (reposted) {
      await supabase.from('reposts').delete().match({ user_id: currentUserId, post_id: post.id })
      // Clear booster if this user was the booster
      if (post.repost_booster_id === currentUserId) {
        await supabase.from('posts').update({ repost_booster_id: null, repost_booster_followers: 0 }).eq('id', post.id)
      }
      setReposted(false)
      setReposts(r => Math.max(0, r - 1))
    } else {
      await supabase.from('reposts').insert({ user_id: currentUserId, post_id: post.id })
      // If reposter has more followers than original poster, set as booster
      if (currentProfile) {
        const reposterFollowers = currentProfile.followers_count ?? 0
        const originalFollowers = profile?.followers_count ?? 0
        const currentBoosterFollowers = post.repost_booster_followers ?? 0
        if (reposterFollowers > originalFollowers && reposterFollowers > currentBoosterFollowers) {
          await supabase.from('posts').update({
            repost_booster_id: currentUserId,
            repost_booster_followers: reposterFollowers,
          }).eq('id', post.id)
        }
      }
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
        ref={articleRef}
        onClick={handleCardClick}
        data-post-id={post.id}
        className={`border-b border-border hover:bg-foreground/[0.02] cursor-pointer transition-all duration-500 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Repost indicator + boost reach */}
        {isReposted && currentProfile && (
          <div className="flex items-center gap-1.5 px-4 pt-2.5 pb-0.5">
            <div className="w-10 flex justify-end">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l4 4-4 4M8 21l-4-4 4-4M20 7H9a4 4 0 00-4 4v1M4 17h11a4 4 0 004-4v-1" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-green-500">{currentProfile.display_name} reposted</span>
            {(() => {
              const boosterFollowers = post.repost_booster_followers ?? 0
              const originalFollowers = profile?.followers_count ?? 0
              const totalReach = boosterFollowers + originalFollowers
              if (totalReach <= 0) return null
              return (
                <span className="ml-auto flex items-center gap-1 text-xs text-foreground-secondary">
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                  <span className="font-semibold text-foreground">{formatCount(totalReach)}</span> reach
                </span>
              )
            })()}
          </div>
        )}
        
        <div className="flex gap-3 px-4 py-3">
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
              {profile.is_verified && <VerifiedBadge size={14} />}
              {(profile.level ?? 0) > 0 && <GemBadge level={profile.level!} size={16} />}
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
            
            {/* 3-dot menu */}
            <div className="ml-auto relative">
              <button
                onClick={e => { e.stopPropagation(); setShowMenu(m => !m); }}
                className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground-secondary hover:text-primary"
                aria-label="More"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              
              {showMenu && (
                <div 
                  className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-2xl shadow-xl w-56 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200" 
                  onClick={e => e.stopPropagation()}
                >
                  {currentProfile && post.user_id === currentUserId && (
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        const supabase = createClient();
                        const isPinned = currentProfile.pinned_post_id === post.id;
                        if (isPinned) {
                          await supabase.from('profiles').update({ pinned_post_id: null }).eq('id', currentUserId);
                        } else {
                          await supabase.from('profiles').update({ pinned_post_id: post.id }).eq('id', currentUserId);
                        }
                        setShowMenu(false);
                        router.refresh();
                      }}
                      className="w-full text-left px-4 py-3 text-foreground hover:bg-foreground/10 transition font-medium flex items-center gap-3"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5l14 14m-7-7V5m0 3a3 3 0 100-6" />
                      </svg>
                      {currentProfile.pinned_post_id === post.id ? 'Unpin from profile' : 'Pin to profile'}
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleSave(e as unknown as React.MouseEvent); setShowMenu(false); }}
                    className={`w-full text-left px-4 py-3 hover:bg-foreground/10 transition font-medium flex items-center gap-3 ${saved ? 'text-primary' : 'text-foreground'}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                    </svg>
                    {saved ? 'Remove Bookmark' : 'Bookmark'}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setShowShareModal(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-3 text-foreground hover:bg-foreground/10 transition font-medium flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    Share
                  </button>
                </div>
              )}
            </div>
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
              {reposts > 0 && <FormattedOdometer value={reposts} className="text-xs" />}
              <span className="action-tooltip">{reposted ? 'Undo repost' : 'Repost'}</span>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`action-btn group relative flex items-center gap-2 hover:text-pink-500 transition ${liked ? 'text-pink-500' : ''}`}
              aria-label="Like"
            >
              <span className="p-2 rounded-full group-hover:bg-pink-500/10 transition">
                <svg
                  viewBox="0 0 24 24"
                  className="w-[18px] h-[18px]"
                  fill={liked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </span>
              {likes > 0 && <FormattedOdometer value={likes} className="text-xs" />}
              <span className="action-tooltip">{liked ? 'Unlike' : 'Like'}</span>
            </button>

            {/* Views — display only, not clickable */}
            <span
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1.5 text-foreground-secondary cursor-default select-none"
              aria-label="Views"
            >
              <span className="p-2">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              {post.views_count > 0 && <span className="text-xs">{formatCount(post.views_count)}</span>}
            </span>

            {/* Bookmark */}
            <button
              onClick={e => { e.stopPropagation(); handleSave(e); }}
              className={`action-btn group relative flex items-center gap-2 transition ${saved ? 'text-primary' : 'hover:text-primary'}`}
              aria-label="Bookmark"
            >
              <span className="p-2 rounded-full group-hover:bg-primary/10 transition">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                </svg>
              </span>
              <span className="action-tooltip">{saved ? 'Remove Bookmark' : 'Bookmark'}</span>
            </button>

            {/* Share */}
            <button
              onClick={e => { e.stopPropagation(); setShowShareModal(true); }}
              className="action-btn group relative flex items-center gap-2 hover:text-primary transition"
              aria-label="Share"
            >
              <span className="p-2 rounded-full group-hover:bg-primary/10 transition">
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
              </span>
              <span className="action-tooltip">Share</span>
            </button>
          </div>
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
            const supabase = (await import('@/lib/supabase/client')).createClient()
            if (reposted) {
              await supabase.from('reposts').delete().match({ user_id: currentUserId, post_id: post.id })
              if (post.repost_booster_id === currentUserId) {
                await supabase.from('posts').update({ repost_booster_id: null, repost_booster_followers: 0 }).eq('id', post.id)
              }
              setReposted(false)
              setReposts(r => Math.max(0, r - 1))
              onUpdate?.({ ...post, reposts_count: Math.max(0, reposts - 1), user_reposted: false })
            } else {
              await supabase.from('reposts').insert({ user_id: currentUserId, post_id: post.id })
              if (currentProfile) {
                const reposterFollowers = currentProfile.followers_count ?? 0
                const originalFollowers = profile?.followers_count ?? 0
                const currentBoosterFollowers = post.repost_booster_followers ?? 0
                if (reposterFollowers > originalFollowers && reposterFollowers > currentBoosterFollowers) {
                  await supabase.from('posts').update({
                    repost_booster_id: currentUserId,
                    repost_booster_followers: reposterFollowers,
                  }).eq('id', post.id)
                }
              }
              setReposted(true)
              setReposts(r => r + 1)
              onUpdate?.({ ...post, reposts_count: reposts + 1, user_reposted: true })
            }
          }}
        />
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal
          post={post}
          currentUserId={currentUserId}
          onClose={() => setShowShareModal(false)}
          saved={saved}
          onToggleSave={async () => {
            const supabase = createClient();
            if (saved) {
              await supabase.from('saves').delete().match({ user_id: currentUserId, post_id: post.id });
              setSaved(false);
              setSaves(s => Math.max(0, s - 1));
            } else {
              await supabase.from('saves').insert({ user_id: currentUserId, post_id: post.id });
              setSaved(true);
              setSaves(s => s + 1);
            }
          }}
        />
      )}
    </>
  )
}
