'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatFollowers } from '@/lib/format'
import VerifiedBadge from './VerifiedBadge'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface TrendingTag {
  tag: string
  post_count: number
}

export default function RightSidebar({ currentUserId }: { currentUserId: string }) {
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [trends, setTrends] = useState<TrendingTag[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: suggestData }, { data: trendData }, { data: followData }] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .order('followers_count', { ascending: false })
        .limit(5),
      supabase
        .from('hashtags')
        .select('tag, post_count')
        .order('post_count', { ascending: false })
        .limit(5),
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId),
    ])
    setSuggestions(suggestData || [])
    setTrends(trendData || [])
    setFollowing(new Set((followData || []).map((f: { following_id: string }) => f.following_id)))
  }, [currentUserId])

  useEffect(() => { load() }, [load])

  async function handleFollow(targetId: string) {
    const supabase = createClient()
    if (following.has(targetId)) {
      await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: targetId })
      setFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s })
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: targetId })
      setFollowing(prev => new Set([...prev, targetId]))
    }
  }

  async function handleSearch(q: string) {
    setSearch(q)
    if (!q.trim()) { setSearchResults([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(5)
    setSearchResults(data || [])
  }

  return (
    <div className="flex flex-col gap-4 py-2 px-2">
      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary">
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search PeytOtoria"
          className="w-full rounded-full bg-[var(--search-bg)] pl-10 pr-4 py-3 text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm transition"
        />
        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
            {searchResults.map(p => (
              <Link key={p.id} href={`/profile/${p.username}`} onClick={() => { setSearch(''); setSearchResults([]) }}>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/10 transition">
                  <Image src={p.avatar_url || DEFAULT_AVATAR} alt={p.display_name} width={40} height={40} className="rounded-full w-10 h-10 object-cover" unoptimized />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-sm text-foreground">{p.display_name}</span>
                      {p.followers_count >= 199000 && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-foreground-secondary text-xs">@{p.username}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Trending */}
      {trends.length > 0 && (
        <div className="bg-background-secondary rounded-2xl overflow-hidden border border-border">
          <h2 className="font-black text-foreground text-xl px-4 pt-4 pb-2">Trends for you</h2>
          {trends.map(t => (
            <Link key={t.tag} href={`/home?tag=${t.tag}`}>
              <div className="px-4 py-3 hover:bg-foreground/10 transition cursor-pointer">
                <p className="font-bold text-foreground text-sm">#{t.tag}</p>
                <p className="text-foreground-secondary text-xs">{formatFollowers(t.post_count)} posts</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Who to follow */}
      {suggestions.length > 0 && (
        <div className="bg-background-secondary rounded-2xl overflow-hidden border border-border">
          <h2 className="font-black text-foreground text-xl px-4 pt-4 pb-2">Who to follow</h2>
          {suggestions.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-foreground/10 transition">
              <Link href={`/profile/${p.username}`} className="flex items-center gap-3 min-w-0">
                <Image src={p.avatar_url || DEFAULT_AVATAR} alt={p.display_name} width={40} height={40} className="rounded-full w-10 h-10 object-cover flex-shrink-0" unoptimized />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-foreground truncate">{p.display_name}</span>
                    {p.followers_count >= 199000 && <VerifiedBadge size={14} />}
                  </div>
                  <p className="text-foreground-secondary text-xs truncate">@{p.username}</p>
                </div>
              </Link>
              <button
                onClick={() => handleFollow(p.id)}
                className={`flex-shrink-0 ml-2 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  following.has(p.id)
                    ? 'bg-transparent border border-border text-foreground hover:border-destructive hover:text-destructive hover:bg-destructive/10'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                {following.has(p.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-foreground-secondary text-xs px-2 pb-4">
        &copy; 2026 PeytOtoria
      </p>
    </div>
  )
}
