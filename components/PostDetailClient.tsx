'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatCount, formatFullDate } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import GemBadge from './GemBadge'
import PostContent from './PostContent'
import Odometer from './Odometer'
import MediaViewer from './MediaViewer'
import ReplyModal from './ReplyModal'
import RepostModal from './RepostModal'
import PostCard from './PostCard'
import ReplyCard from './ReplyCard'
import type { Post, Like, Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  post: Post
  likers: Like[]
  currentUserId: string
  currentProfile?: Profile
  initialReplies?: Post[]
  recommendedPosts?: Post[]
}

type Modal = 'likes' | null

export default function PostDetailClient({ post: initialPost, likers: initialLikers, currentUserId, currentProfile, initialReplies = [], recommendedPosts = [] }: Props) {
  const router = useRouter()
  const [post, setPost] = useState(initialPost)
  const [liked, setLiked] = useState(initialPost.user_liked ?? false)
  const [reposted, setReposted] = useState(initialPost.user_reposted ?? false)
  const [saved, setSaved] = useState(initialPost.user_saved ?? false)
  const [likes, setLikes] = useState(initialPost.likes_count)
  const [reposts, setReposts] = useState(initialPost.reposts_count)
  const [saves, setSaves] = useState(initialPost.saves_count)
  const [replies, setReplies] = useState<Post[]>(initialReplies)
  const [replyCount, setReplyCount] = useState(initialReplies.length)
  const [modal, setModal] = useState<Modal>(null)
  const [likers, setLikers] = useState(initialLikers)
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [showRepostModal, setShowRepostModal] = useState(false)

  const profile = post.profiles!
  const mediaUrls = post.media_urls?.filter(Boolean) ?? []

  async function handleLike() {
    const supabase = createClient()
    if (liked) {
      await supabase.from('likes').delete().match({ user_id: currentUserId, post_id: post.id })
      setLiked(false)
      setLikes(l => Math.max(0, l - 1))
    } else {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: post.id })
      setLiked(true)
      setLikes(l => l + 1)
      const { data } = await supabase.from('likes').select('*, profiles(*)').eq('post_id', post.id).order('created_at', { ascending: false }).limit(20)
      setLikers(data || [])
    }
  }

  async function handleRepost() {
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

  async function handleReplied() {
    setShowReplyModal(false)
    // Refetch replies
    const supabase = createClient()
    const { data } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(*)')
      .eq('reply_to_id', post.id)
      .order('created_at', { ascending: true })
    if (data) {
      setReplies(data)
      setReplyCount(data.length)
    }
  }

  async function handleSave() {
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

  return (
    <>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-6 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-foreground/10 transition text-foreground"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-foreground">Post</h2>
        </header>

        {/* Post detail */}
        <article className="px-4 py-4 border-b border-border">
          {/* Author */}
          <div className="flex items-center gap-3 mb-4">
            <Link href={`/profile/${profile.username}`}>
              <Image
                src={profile.avatar_url || DEFAULT_AVATAR}
                alt={profile.display_name}
                width={48}
                height={48}
                className="rounded-full w-12 h-12 object-cover"
                unoptimized
              />
            </Link>
            <div className="flex flex-col min-w-0 flex-1">
              <Link href={`/profile/${profile.username}`} className="flex items-center gap-1 hover:underline">
                <span className="font-bold text-foreground">{profile.display_name}</span>
                {profile.is_verified && <VerifiedBadge size={16} />}
                {(profile.level ?? 0) > 0 && <GemBadge level={profile.level!} size={17} />}
              </Link>
              <span className="text-foreground-secondary text-sm">@{profile.username}</span>
            </div>

          </div>

          {/* Content */}
          <PostContent content={post.content} className="text-[22px] text-foreground leading-relaxed mb-4" />

          {/* Media grid */}
          {mediaUrls.length > 0 && (
            <div
              className={`mb-4 grid gap-1 rounded-2xl overflow-hidden border border-border/50 ${
                mediaUrls.length === 1 ? 'grid-cols-1' :
                mediaUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
              }`}
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
                        <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                          <svg viewBox="0 0 24 24" className="w-7 h-7 text-white ml-0.5" fill="currentColor">
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

          {/* Timestamp */}
          <div className="text-foreground-secondary text-sm mb-4 border-b border-border pb-4">
            {formatFullDate(post.created_at)}
          </div>

          {/* Stats row */}
          <div className="flex gap-5 text-sm text-foreground border-b border-border pb-4 mb-4 flex-wrap">
            {reposts > 0 && (
              <span>
                <strong className="text-foreground font-bold tabular-nums"><Odometer value={reposts} /></strong>{' '}
                <span className="text-foreground-secondary">Reposts</span>
              </span>
            )}
            {likes > 0 && (
              <button onClick={() => setModal('likes')} className="hover:underline">
                <strong className="text-foreground font-bold tabular-nums"><Odometer value={likes} /></strong>{' '}
                <span className="text-foreground-secondary">Likes</span>
              </button>
            )}
            {post.views_count > 0 && (
              <span>
                <strong className="text-foreground font-bold tabular-nums">{formatCount(post.views_count)}</strong>{' '}
                <span className="text-foreground-secondary">Views</span>
              </span>
            )}
            {saves > 0 && (
              <span>
                <strong className="text-foreground font-bold tabular-nums"><Odometer value={saves} /></strong>{' '}
                <span className="text-foreground-secondary">Saves</span>
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-around text-foreground-secondary">
            {/* Repost */}
            <button
              onClick={() => {
                if (!currentUserId) { router.push('/auth/login'); return }
                setShowRepostModal(true)
              }}
              className={`action-btn group relative flex items-center gap-2 hover:text-green-500 transition p-2 rounded-full hover:bg-green-500/10 ${reposted ? 'text-green-500' : ''}`}
              aria-label="Repost"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
              </svg>
              {reposts > 0 && <span className="text-sm"><Odometer value={reposts} /></span>}
              <span className="action-tooltip">{reposted ? 'Undo repost' : 'Repost'}</span>
            </button>

            {/* Like */}
            <button
              onClick={handleLike}
              className={`action-btn group relative flex items-center gap-2 hover:text-pink-500 transition p-2 rounded-full hover:bg-pink-500/10 ${liked ? 'text-pink-500' : ''}`}
              aria-label="Like"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {likes > 0 && <span className="text-sm"><Odometer value={likes} /></span>}
              <span className="action-tooltip">{liked ? 'Unlike' : 'Like'}</span>
            </button>

            {/* Stats */}
            <button
              onClick={() => router.push(`/stats/${post.id}`)}
              className="action-btn group relative flex items-center gap-2 hover:text-primary transition p-2 rounded-full hover:bg-primary/10"
              aria-label="View stats"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="action-tooltip">Views</span>
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              className={`action-btn group relative flex items-center gap-2 hover:text-primary transition p-2 rounded-full hover:bg-primary/10 ${saved ? 'text-primary' : ''}`}
              aria-label="Save"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <span className="action-tooltip">{saved ? 'Unsave' : 'Save'}</span>
            </button>
          </div>
        </article>

        {/* Likers / Views Modal */}
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-popover border border-border rounded-2xl w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-bold text-foreground">Liked by</h3>
                <button onClick={() => setModal(null)} className="p-1 rounded-full hover:bg-foreground/10 transition text-foreground">
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto">
                {modal === 'likes' && likers.length === 0 && (
                  <p className="text-foreground-secondary text-center py-8">No likes yet</p>
                )}
                {modal === 'likes' && likers.map(liker => (
                  <Link
                    key={liker.id}
                    href={`/profile/${liker.profiles?.username}`}
                    onClick={() => setModal(null)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/10 transition"
                  >
                    <Image
                      src={liker.profiles?.avatar_url || DEFAULT_AVATAR}
                      alt={liker.profiles?.display_name || 'User'}
                      width={40}
                      height={40}
                      className="rounded-full w-10 h-10 object-cover"
                      unoptimized
                    />
                    <div>
                      <div className="flex items-center gap-1">
                  <span className="font-bold text-sm text-foreground">{liker.profiles?.display_name}</span>
                  {liker.profiles?.is_verified && <VerifiedBadge size={14} />}
                  {(liker.profiles?.level ?? 0) > 0 && <GemBadge level={liker.profiles!.level!} size={15} />}
                      </div>
                      <p className="text-foreground-secondary text-xs">@{liker.profiles?.username}</p>
                    </div>
                  </Link>
                ))}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Media viewer */}
      {mediaViewerIndex !== null && (
        <MediaViewer
          urls={mediaUrls}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerIndex(null)}
        />
      )}



      {/* Repost modal */}
      {showRepostModal && (
        <RepostModal
          post={post}
          reposted={reposted}
          onClose={() => setShowRepostModal(false)}
          onConfirm={handleRepost}
        />
      )}

      {/* Recommended posts */}
      {recommendedPosts.length > 0 && (
        <div>
          <div className="px-4 py-3 border-t border-b border-border bg-muted/30">
            <p className="font-bold text-foreground text-sm">More posts you might like</p>
          </div>
          {recommendedPosts.map(rec => (
            <PostCard
              key={rec.id}
              post={rec}
              currentUserId={currentUserId}
              currentProfile={currentProfile}
            />
          ))}
        </div>
      )}
    </>
  )
}
