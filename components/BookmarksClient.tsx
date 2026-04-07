'use client'

import { useState } from 'react'
import PostCard from './PostCard'
import type { Post } from '@/lib/types'

interface Props {
  posts: Post[]
  currentUserId: string
}

export default function BookmarksClient({ posts: initialPosts, currentUserId }: Props) {
  const [posts, setPosts] = useState(initialPosts)

  return (
    <div>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <h2 className="text-xl font-bold text-foreground">Bookmarks</h2>
      </header>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center px-8">
          <p className="text-2xl font-black text-foreground">Save posts for later</p>
          <p className="text-foreground-secondary">
            Bookmark posts to easily find them again in the future.
          </p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onUpdate={updated => setPosts(prev => prev.map(p => p.id === updated.id ? updated : p))}
          />
        ))
      )}
    </div>
  )
}
