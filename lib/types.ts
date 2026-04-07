export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string
  avatar_url: string | null
  banner_url: string | null
  location: string
  website: string
  followers_count: number
  following_count: number
  posts_count: number
  joined_at: string | null
  created_at: string
  updated_at: string
  is_bot?: boolean
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  likes_count: number
  reposts_count: number
  saves_count: number
  views_count: number
  real_views_count: number
  is_archived: boolean
  media_urls?: string[] | null
  reply_to_id?: string | null
  profiles?: Profile | null
  // Client-side flags
  user_liked?: boolean
  user_reposted?: boolean
  user_saved?: boolean
}

export interface Like {
  id: string
  user_id: string
  post_id: string
  created_at: string
  profiles?: Profile | null
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Hashtag {
  id: string
  tag: string
  post_count: number
}
