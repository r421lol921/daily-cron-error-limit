'use client'

import PostCard from './PostCard'
import type { Post, Profile } from '@/lib/types'

interface Props {
  posts: Post[]
  currentUserId: string
  currentProfile: Profile | null
}

export default function ClipsClient({ posts, currentUserId, currentProfile }: Props) {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border flex items-center gap-3 px-4 py-3">
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75.125c0-.621.504-1.125 1.125-1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125m1.125-1.125V6.375c0-.621.504-1.125 1.125-1.125m-2.25 13.125V5.625A1.125 1.125 0 015.625 4.5h12.75c.621 0 1.125.504 1.125 1.125v12.75c0 .621-.504 1.125-1.125 1.125m-2.25-13.125c0-.621.504-1.125 1.125-1.125M6 18.375V5.625m0 12.75a1.125 1.125 0 001.125 1.125m-1.125-1.125V5.625" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <h1 className="font-bold text-xl text-foreground">Clips</h1>
      </header>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-foreground-secondary" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <p className="text-2xl font-black text-foreground">No clips yet</p>
          <p className="text-foreground-secondary text-sm">Posts with videos will appear here.</p>
        </div>
      ) : (
        <div>
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              currentProfile={currentProfile ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
