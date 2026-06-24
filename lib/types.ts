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
  is_verified?: boolean
  verified_at?: string | null
  verified_badge_type?: string | null
  pinned_post_id?: string | null
  // Custom profile fields
  bio_italic?: boolean | null
  // Profile enhancements
  cover_photo_url?: string | null
  theme?: string
  is_private?: boolean
  pronouns?: string
  birth_date?: string | null
  header_background_color?: string
  profile_background_color?: string
  last_seen_at?: string | null
  // PeytO Gems
  gem_count?: number
  level?: number
  // Oats
  oat_views_count?: number
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  expires_at?: string | null
  likes_count: number
  reposts_count: number
  replies_count: number
  saves_count: number
  views_count: number
  real_views_count: number
  is_archived: boolean
  media_urls?: string[] | null
  reply_to_id?: string | null
  profiles?: Profile | null
  // Repost boost
  repost_booster_id?: string | null
  repost_booster_followers?: number
  repost_booster_profile?: Profile | null
  // Client-side flags
  user_liked?: boolean
  user_reposted?: boolean
  user_saved?: boolean
}

export interface OatPost {
  id: string
  user_id: string
  caption: string
  video_url: string
  thumbnail_url: string | null
  likes_count: number
  views_count: number
  real_views_count: number
  saves_count: number
  shares_count: number
  is_archived: boolean
  expires_at?: string | null
  created_at: string
  profiles?: Profile | null
  user_liked?: boolean
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
