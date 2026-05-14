'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import PostCard from './PostCard'
import VerifiedBadge from './VerifiedBadge'
import type { Profile, Post } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile | null
  recommendedPosts: Post[]
  currentUserId: string
}

type SearchMode = 'people' | 'feed' | 'groups'

export default function DiscoverClient({ profile, recommendedPosts: initialPosts, currentUserId }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>('people')
  const [searching, setSearching] = useState(false)
  const [peopleResults, setPeopleResults] = useState<Profile[]>([])
  const [feedResults, setFeedResults] = useState<Post[]>([])
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasQuery = query.trim().length > 0

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function runSearch(q: string, mode: SearchMode) {
    if (!q.trim()) { setPeopleResults([]); setFeedResults([]); return }
    setSearching(true)
    const supabase = createClient()
    if (mode === 'people') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .limit(20)
      setPeopleResults((data as Profile[]) || [])
    } else if (mode === 'feed') {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles!posts_user_id_fkey(*)')
        .ilike('content', `%${q}%`)
        .eq('is_archived', false)
        .order('likes_count', { ascending: false })
        .limit(20)
      setFeedResults((data as Post[]) || [])
    } else if (mode === 'groups') {
      // Groups search — navigate to groups page with query
      router.push(`/groups?search=${encodeURIComponent(q)}`)
    }
    setSearching(false)
  }

  function handleModeChange(mode: SearchMode) {
    setSearchMode(mode)
    if (hasQuery) runSearch(query, mode)
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (val.trim()) runSearch(val, searchMode)
    else { setPeopleResults([]); setFeedResults([]) }
  }

  const showDropdown = focused && !hasQuery
  const showResults = focused && hasQuery

  return (
    <div className="min-h-screen">
      {/* Sticky header + search */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <h2 className="text-xl font-bold text-foreground mb-3">Discover</h2>

          {/* Search bar */}
          <div ref={containerRef} className="relative">
            <div className={`flex items-center gap-3 bg-muted rounded-full px-4 py-3 transition-all ${focused ? 'ring-2 ring-primary/50' : ''}`}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground-secondary shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleQueryChange}
                onFocus={() => setFocused(true)}
                placeholder="Search PeytOtoria"
                className="flex-1 bg-transparent text-foreground placeholder:text-foreground-secondary outline-none text-sm"
              />
              {query && (
                <button onClick={() => { setQuery(''); setPeopleResults([]); setFeedResults([]) }} className="text-foreground-secondary hover:text-foreground transition">
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown: search type options (when focused, no query) */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {(['people', 'feed', 'groups'] as SearchMode[]).map(mode => (
                  <button
                    key={mode}
                    onMouseDown={e => { e.preventDefault(); handleModeChange(mode) }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition text-left"
                  >
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      {mode === 'people' && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                        </svg>
                      )}
                      {mode === 'feed' && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                        </svg>
                      )}
                      {mode === 'groups' && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      Search in {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search mode tabs (shown when actively searching) */}
          {focused && (
            <div className="flex gap-1 mt-3">
              {(['people', 'feed', 'groups'] as SearchMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleModeChange(mode)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition ${
                    searchMode === mode
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground-secondary hover:bg-foreground/10'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Search results */}
      {showResults && (
        <div>
          {searching ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchMode === 'people' ? (
            peopleResults.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-foreground font-bold text-lg">No people found</p>
                <p className="text-foreground-secondary text-sm mt-1">Try a different name or username</p>
              </div>
            ) : (
              <div>
                {peopleResults.map(person => (
                  <Link key={person.id} href={`/profile/${person.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition border-b border-border">
                    <Image src={person.avatar_url || DEFAULT_AVATAR} alt={person.display_name} width={44} height={44} className="rounded-full w-11 h-11 object-cover shrink-0" unoptimized />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-foreground text-sm truncate">{person.display_name}</span>
                        {person.followers_count >= 1000 && <VerifiedBadge size={14} />}
                      </div>
                      <p className="text-xs text-foreground-secondary truncate">@{person.username}</p>
                      {person.bio && <p className="text-xs text-foreground-secondary mt-0.5 line-clamp-1">{person.bio}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : searchMode === 'feed' ? (
            feedResults.length === 0 ? (
              <div className="px-4 py-16 text-center">
                <p className="text-foreground font-bold text-lg">No posts found</p>
                <p className="text-foreground-secondary text-sm mt-1">Try different keywords</p>
              </div>
            ) : (
              <div>
                {feedResults.map(post => (
                  <PostCard key={post.id} post={post} currentUserId={currentUserId} currentProfile={profile ?? undefined} onUpdate={updated => setFeedResults(prev => prev.map(p => p.id === updated.id ? updated : p))} />
                ))}
              </div>
            )
          ) : null}
        </div>
      )}

      {/* Recommended posts (default view) */}
      {!showResults && (
        <div>
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-bold text-foreground">Recommended for You</h3>
            <p className="text-xs text-foreground-secondary mt-0.5">Posts you might enjoy</p>
          </div>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 px-8 text-center">
              <p className="text-2xl font-black text-foreground">Nothing here yet</p>
              <p className="text-foreground-secondary text-sm">Follow more people to get personalized recommendations</p>
            </div>
          ) : (
            posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                currentProfile={profile ?? undefined}
                onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
