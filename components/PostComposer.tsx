'use client'

import { useRef, useState } from 'react'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || loading) return
    setLoading(true)
    const supabase = createClient()

    // Insert post
    const { data: post, error } = await supabase
      .from('posts')
      .insert({ user_id: profile.id, content: trimmed })
      .select()
      .single()

    if (!error && post) {
      // Extract hashtags
      const tags = [...new Set([...trimmed.matchAll(/#(\w+)/g)].map(m => m[1].toLowerCase()))]
      for (const tag of tags) {
        // Upsert hashtag
        const { data: ht } = await supabase
          .from('hashtags')
          .upsert({ tag }, { onConflict: 'tag' })
          .select('id')
          .single()
        if (ht) {
          await supabase.from('post_hashtags').insert({ post_id: post.id, hashtag_id: ht.id }).throwOnError()
          await supabase.rpc('increment_hashtag', { tag_name: tag }).maybeSingle()
        }
      }
    }

    setLoading(false)
    setContent('')
    if (textareaRef.current) { textareaRef.current.style.height = 'auto' }
    onPosted?.()
  }

  const remaining = 280 - content.length
  const canPost = content.trim().length > 0 && content.length <= 280

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
        <textarea
          ref={textareaRef}
          id="post-composer"
          value={content}
          onChange={e => { setContent(e.target.value); autoResize() }}
          placeholder="What is happening?!"
          rows={1}
          className="w-full bg-transparent text-xl text-foreground placeholder:text-foreground-secondary resize-none outline-none min-h-[28px] leading-relaxed"
          style={{ height: '28px' }}
        />
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2 text-primary">
            {/* Media icon */}
            <button type="button" className="p-2 rounded-full hover:bg-primary/10 transition" aria-label="Add media">
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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
              {loading ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
