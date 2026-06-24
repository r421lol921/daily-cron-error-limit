'use client'

import { createClient } from './client'

const AVATAR_BUCKET = 'avatars'
const BANNER_BUCKET = 'banners'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Upload a profile avatar image to Supabase storage
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File size must be under 5MB' }
    }

    const supabase = createClient()

    // Create unique filename with timestamp
    const timestamp = Date.now()
    const filename = `${userId}/${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('[v0] Avatar upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(data.path)

    return { success: true, url: publicUrl }
  } catch (err) {
    console.error('[v0] Avatar upload exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    }
  }
}

/**
 * Upload a profile banner image to Supabase storage
 */
export async function uploadBanner(
  userId: string,
  file: File
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File size must be under 5MB' }
    }

    const supabase = createClient()

    // Create unique filename with timestamp
    const timestamp = Date.now()
    const filename = `${userId}/${timestamp}-${file.name}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BANNER_BUCKET)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('[v0] Banner upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(BANNER_BUCKET).getPublicUrl(data.path)

    return { success: true, url: publicUrl }
  } catch (err) {
    console.error('[v0] Banner upload exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Upload failed',
    }
  }
}

/**
 * Delete an avatar from storage
 */
export async function deleteAvatar(userId: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove([path])

    if (error) {
      console.error('[v0] Delete avatar error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[v0] Delete avatar exception:', err)
    return false
  }
}

/**
 * Delete a banner from storage
 */
export async function deleteBanner(userId: string, path: string): Promise<boolean> {
  try {
    const supabase = createClient()
    const { error } = await supabase.storage
      .from(BANNER_BUCKET)
      .remove([path])

    if (error) {
      console.error('[v0] Delete banner error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[v0] Delete banner exception:', err)
    return false
  }
}

/**
 * Get signed URL for an avatar (useful for private files in future)
 */
export async function getAvatarSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(AVATAR_BUCKET)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('[v0] Get signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('[v0] Get signed URL exception:', err)
    return null
  }
}

/**
 * Get signed URL for a banner
 */
export async function getBannerSignedUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.storage
      .from(BANNER_BUCKET)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('[v0] Get signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (err) {
    console.error('[v0] Get signed URL exception:', err)
    return null
  }
}
