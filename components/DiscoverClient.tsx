'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Profile, Hashtag } from '@/lib/types'
import VerifiedBadge from './VerifiedBadge'
import { formatCount } from '@/lib/format'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile | null
  hashtags: Hashtag[]
  topCreators: Profile[]
}

export default function DiscoverClient({ profile, hashtags, topCreators }: Props) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredHashtags = hashtags.filter(tag => 
    tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="px-4 py-3">
          <h2 className="text-xl font-bold text-foreground mb-3">Discover</h2>
          
          {/* Search bar */}
          <div className="relative">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search hashtags..."
              className="w-full bg-muted text-foreground placeholder:text-foreground-secondary rounded-full pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 transition"
            />
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-0 md:gap-4">
        {/* Trending Hashtags */}
        <section className="border-b md:border-r md:border-b-0 border-border">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-bold text-foreground">Trending Hashtags</h3>
          </div>
          
          {filteredHashtags.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-foreground-secondary">
                {searchQuery ? 'No hashtags found' : 'No trending hashtags yet'}
              </p>
            </div>
          ) : (
            <div>
              {filteredHashtags.map((hashtag, index) => (
                <Link
                  key={hashtag.id}
                  href={`/home?search=${encodeURIComponent('#' + hashtag.tag)}`}
                  className="flex items-center justify-between px-4 py-4 hover:bg-foreground/5 transition border-b border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-foreground-secondary font-bold text-lg w-6">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">#{hashtag.tag}</p>
                      <p className="text-sm text-foreground-secondary">
                        {formatCount(hashtag.post_count)} {hashtag.post_count === 1 ? 'post' : 'posts'}
                      </p>
                    </div>
                  </div>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Top Creators Today */}
        <section>
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h3 className="font-bold text-foreground">Top Creators</h3>
            <p className="text-xs text-foreground-secondary mt-1">Most followed accounts</p>
          </div>
          
          {topCreators.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-foreground-secondary">No creators yet</p>
            </div>
          ) : (
            <div>
              {topCreators.map((creator, index) => (
                <Link
                  key={creator.id}
                  href={`/profile/${creator.username}`}
                  className="flex items-center justify-between px-4 py-4 hover:bg-foreground/5 transition border-b border-border"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-foreground-secondary font-bold text-lg w-6">
                      {index + 1}
                    </span>
                    <Image
                      src={creator.avatar_url || DEFAULT_AVATAR}
                      alt={creator.display_name}
                      width={40}
                      height={40}
                      className="rounded-full w-10 h-10 object-cover"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm text-foreground truncate">
                          {creator.display_name}
                        </span>
                        {creator.followers_count >= 1000 && <VerifiedBadge size={14} />}
                      </div>
                      <p className="text-xs text-foreground-secondary truncate">
                        @{creator.username}
                      </p>
                      <p className="text-xs text-foreground-secondary mt-0.5">
                        {formatCount(creator.followers_count)} followers
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
