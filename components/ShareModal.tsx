'use client'

import { createClient } from '@/lib/supabase/client'
import type { Post } from '@/lib/types'

interface Props {
  post: Post
  currentUserId: string
  onClose: () => void
  saved: boolean
  onToggleSave: () => void
}

export default function ShareModal({ post, currentUserId, onClose, saved, onToggleSave }: Props) {
  async function copyLink() {
    const url = `${window.location.origin}/post/${post.id}`
    await navigator.clipboard.writeText(url)
    alert('Link copied to clipboard!')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-popover border border-border rounded-2xl shadow-xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => { onToggleSave(); onClose(); }}
          className="w-full text-left px-4 py-3 text-foreground hover:bg-foreground/10 transition font-medium flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
          </svg>
          {saved ? 'Remove from Bookmarks' : 'Bookmark'}
        </button>
        <button
          onClick={copyLink}
          className="w-full text-left px-4 py-3 text-foreground hover:bg-foreground/10 transition font-medium flex items-center gap-3"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Copy link to post
        </button>
      </div>
    </div>
  )
}
