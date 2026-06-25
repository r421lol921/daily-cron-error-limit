'use server'

import { createClient } from './server'
import type { Profile } from '@/lib/types'

/**
 * Look up the email address stored on a profile by username.
 * Used to support username-based login on the client.
 */
export async function getEmailByUsername(
  username: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .ilike('username', username)
      .limit(1)
      .single()

    if (error || !data?.email) {
      return { success: false, error: 'No account found with that username.' }
    }
    return { success: true, email: data.email }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Lookup failed' }
  }
}

/**
 * Update user profile in database
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<{ success: boolean; error?: string; data?: Profile }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('[v0] Update profile error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[v0] Update profile exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Update failed',
    }
  }
}

/**
 * Get profile by username
 */
export async function getProfileByUsername(
  username: string
): Promise<{ success: boolean; data?: Profile; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Profile not found' }
      }
      console.error('[v0] Get profile error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[v0] Get profile exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fetch failed',
    }
  }
}

/**
 * Get profile by ID
 */
export async function getProfileById(
  userId: string
): Promise<{ success: boolean; data?: Profile; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: false, error: 'Profile not found' }
      }
      console.error('[v0] Get profile error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err) {
    console.error('[v0] Get profile exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fetch failed',
    }
  }
}

/**
 * Update profile avatar URL
 */
export async function updateProfileAvatar(
  userId: string,
  avatarUrl: string
): Promise<{ success: boolean; error?: string }> {
  return updateProfile(userId, { avatar_url: avatarUrl }).then((result) => ({
    success: result.success,
    error: result.error,
  }))
}

/**
 * Update profile banner URL
 */
export async function updateProfileBanner(
  userId: string,
  bannerUrl: string
): Promise<{ success: boolean; error?: string }> {
  return updateProfile(userId, { banner_url: bannerUrl }).then((result) => ({
    success: result.success,
    error: result.error,
  }))
}

/**
 * Update last seen timestamp
 */
export async function updateLastSeen(userId: string): Promise<void> {
  try {
    const supabase = await createClient()
    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId)
  } catch (err) {
    console.error('[v0] Update last seen error:', err)
  }
}
