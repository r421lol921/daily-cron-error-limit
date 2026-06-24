'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { X, ImagePlus } from 'lucide-react'
import { uploadAvatar, uploadBanner } from '@/lib/supabase/storage'
import { updateProfile } from '@/lib/supabase/profile-actions'
import type { Profile } from '@/lib/types'

interface EditProfileModalProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
  onSave: (updatedProfile: Profile) => void
  userId: string
}

export default function EditProfileModal({
  profile,
  isOpen,
  onClose,
  onSave,
  userId,
}: EditProfileModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Text fields
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio)
  const [location, setLocation] = useState(profile.location)
  const [website, setWebsite] = useState(profile.website)
  const [pronouns, setPronouns] = useState(profile.pronouns || '')
  const [tiktokUrl, setTiktokUrl] = useState(profile.tiktok_url || '')
  const [youtubeUrl, setYoutubeUrl] = useState(profile.youtube_url || '')

  // Images
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      let avatarUrl = profile.avatar_url
      let bannerUrl = profile.banner_url

      // Upload avatar if changed
      if (avatarFile) {
        const uploadResult = await uploadAvatar(userId, avatarFile)
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Avatar upload failed')
          setSaving(false)
          return
        }
        avatarUrl = uploadResult.url!
      }

      // Upload banner if changed
      if (bannerFile) {
        const uploadResult = await uploadBanner(userId, bannerFile)
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Banner upload failed')
          setSaving(false)
          return
        }
        bannerUrl = uploadResult.url!
      }

      // Update profile in database
      const result = await updateProfile(userId, {
        display_name: displayName,
        bio: bio,
        location: location,
        website: website,
        pronouns: pronouns,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        tiktok_url: tiktokUrl || null,
        youtube_url: youtubeUrl || null,
      })

      if (!result.success) {
        setError(result.error || 'Failed to save profile')
        setSaving(false)
        return
      }

      // Call onSave with updated profile
      onSave(result.data!)

      // Reset form
      setAvatarFile(null)
      setBannerFile(null)
      setAvatarPreview(null)
      setBannerPreview(null)
      setError(null)

      onClose()
    } catch (err) {
      console.error('[v0] Save profile error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    // Reset form on close
    setDisplayName(profile.display_name)
    setBio(profile.bio)
    setLocation(profile.location)
    setWebsite(profile.website)
    setPronouns(profile.pronouns || '')
    setTiktokUrl(profile.tiktok_url || '')
    setYoutubeUrl(profile.youtube_url || '')
    setAvatarFile(null)
    setBannerFile(null)
    setAvatarPreview(null)
    setBannerPreview(null)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Banner Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Banner</label>
            <div
              className="relative w-full h-40 bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg overflow-hidden group cursor-pointer"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerPreview ? (
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
              ) : profile.banner_url ? (
                <Image
                  src={profile.banner_url}
                  alt="Current banner"
                  fill
                  className="object-cover"
                />
              ) : null}

              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all">
                <ImagePlus className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" />
              </div>

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Avatar Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Profile Picture</label>
            <div className="flex gap-4">
              <div
                className="relative w-24 h-24 bg-gray-200 rounded-full overflow-hidden group cursor-pointer flex-shrink-0"
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar preview"
                    fill
                    className="object-cover"
                  />
                ) : profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt="Current avatar"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600" />
                )}

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all">
                  <ImagePlus className="w-5 h-5 text-white opacity-0 group-hover:opacity-100" />
                </div>

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {avatarFile && (
                <button
                  onClick={() => {
                    setAvatarFile(null)
                    setAvatarPreview(null)
                  }}
                  className="self-center text-red-500 hover:text-red-700"
                  title="Remove avatar"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Text Fields */}
          <div>
            <label className="text-sm font-medium mb-1 block">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Bio</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="Tell us about yourself"
              rows={3}
            />
            <div className="text-xs text-gray-500 mt-1">{bio.length}/160</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Location</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={30}
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Website</label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                maxLength={100}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Pronouns</label>
            <Input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              maxLength={20}
              placeholder="he/him, she/her, etc."
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Social Links</p>
            <div className="flex items-center gap-3">
              {/* TikTok icon */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-foreground" fill="currentColor" aria-label="TikTok">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.8 1.54V6.78a4.85 4.85 0 01-1.03-.09z"/>
              </svg>
              <Input
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                maxLength={200}
                placeholder="https://tiktok.com/@username"
                type="url"
              />
            </div>
            <div className="flex items-center gap-3">
              {/* YouTube icon */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0 text-foreground" fill="currentColor" aria-label="YouTube">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <Input
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                maxLength={200}
                placeholder="https://youtube.com/@channel"
                type="url"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Spinner className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
