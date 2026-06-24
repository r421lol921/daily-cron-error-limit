'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import AppLogo from './AppLogo'
import OatsLogo from './OatsLogo'
import ComposeIcon from './ComposeIcon'
import OatUploadModal from './OatUploadModal'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from './ThemeProvider'
import type { Profile } from '@/lib/types'

const DEFAULT_AVATAR = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Twitter_default_profile_400x400-358iw7OidlexpwBMYrebaE5K2u6dFy.png'

interface Props {
  profile: Profile | null
}

export default function LeftSidebar({ profile }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [showMenu, setShowMenu] = useState(false)
  const [showOatModal, setShowOatModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Auto-minimize on mount
  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const navItems = [
    {
      href: '/home',
      label: 'Home',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
      ),
    },
    {
      href: '/discover',
      label: 'Discover',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      href: profile ? `/profile/${profile.username}` : '/home',
      label: 'Profile',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      href: '/bookmarks',
      label: 'Bookmarks',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      ),
    },
    {
      href: '/oats',
      label: 'Oats',
      icon: (active: boolean) => (
        <OatsLogo className={`w-7 h-7 ${active ? 'text-foreground' : 'text-foreground'}`} />
      ),
    },
    {
      href: '/stats',
      label: 'Stats',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Desktop/tablet left sidebar — Compact minimized design */}
      <header className={`fixed left-0 top-0 h-screen z-40 hidden sm:flex flex-col bg-background transition-all duration-300 border-r border-border ${
        isExpanded ? 'w-72' : 'w-20'
      }`}>
        <div className="flex flex-col h-full w-full py-3 px-3 gap-2">
          {/* Toggle & Logo */}
          <div className="flex items-center justify-between mb-1">
            <Link href="/home" className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-foreground/10 transition flex-shrink-0">
              <AppLogo className="w-7 h-7" />
            </Link>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg hover:bg-foreground/10 transition ${!isExpanded ? 'hidden' : ''}`}
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {/* Post Oat button */}
          <button
            onClick={() => {
              if (!profile) { router.push('/auth/login'); return }
              setShowOatModal(true)
            }}
            className={`flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl font-bold transition hover:bg-primary/90 active:bg-primary/80 ${
              isExpanded ? 'w-full py-2.5 px-4' : 'w-10 h-10'
            }`}
            title="New post"
          >
            <ComposeIcon className="w-5 h-5 text-primary-foreground flex-shrink-0" />
            {isExpanded && <span className="text-sm tracking-wide">New Post</span>}
          </button>

          {/* Divider */}
          <div className="h-px bg-border my-2" />

          {/* Nav items */}
          <nav className="flex flex-col gap-2 flex-1">
            {navItems.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-center gap-3 p-2.5 rounded-xl transition ${
                    active
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-foreground hover:bg-foreground/10'
                  } ${isExpanded ? 'w-full' : 'w-10 h-10'}`}
                  title={label}
                >
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{icon(active)}</span>
                  {isExpanded && <span className="text-sm font-medium">{label}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Divider */}
          <div className="h-px bg-border my-2" />

          {/* Bottom actions */}
          <div className="flex flex-col gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-3 p-2.5 rounded-xl hover:bg-foreground/10 transition text-foreground"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              <span className="w-5 h-5 flex-shrink-0">
                {theme === 'dark' ? (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 0l4.24-4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08 0l4.24 4.24" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </span>
              {isExpanded && <span className="text-sm">{theme === 'dark' ? 'Light' : 'Dark'}</span>}
            </button>

            {/* User menu */}
            {profile && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center justify-center gap-3 p-2 rounded-xl hover:bg-foreground/10 transition w-full"
                  title="Account"
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-muted ring-2 ring-foreground/10">
                    <Image
                      src={profile.avatar_url || DEFAULT_AVATAR}
                      alt={profile.display_name}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  {isExpanded && (
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="font-bold text-xs text-foreground truncate">{profile.display_name}</span>
                      <span className="text-foreground-secondary text-xs truncate">@{profile.username}</span>
                    </div>
                  )}
                </button>
                {showMenu && (
                  <div className="absolute left-full top-0 ml-2 bg-popover border border-border rounded-xl shadow-xl w-64 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-bold text-foreground text-sm">{profile.display_name}</p>
                      <p className="text-foreground-secondary text-xs">@{profile.username}</p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-foreground hover:bg-foreground/10 transition font-bold text-sm"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content margin adjustment */}
      <style jsx>{`
        main {
          margin-left: ${mounted && isExpanded ? '288px' : '80px'};
          @media (max-width: 640px) {
            margin-left: 0;
          }
        }
      `}</style>

      {/* Global oat upload modal */}
      {showOatModal && profile && (
        <OatUploadModal
          profile={profile}
          onClose={() => setShowOatModal(false)}
          onPosted={() => { setShowOatModal(false); router.refresh() }}
        />
      )}

      {/* Mobile bottom navigation — Home, Discover, Oats, Profile, Bookmarks */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-1 safe-area-pb">
        {[navItems[0], navItems[1], navItems[4], navItems[2], navItems[3]].map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[52px] rounded-xl transition active:scale-90 ${active ? 'text-primary' : 'text-foreground-secondary'}`}
              aria-label={label}
            >
              <span className={`transition-transform ${active ? 'text-primary scale-105' : 'text-foreground-secondary'}`}>
                {icon(active)}
              </span>
              <span className={`text-[10px] font-semibold ${active ? 'text-primary' : 'text-foreground-secondary'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Floating Oat button — mobile only */}
      <div className="sm:hidden fixed bottom-[68px] right-5 z-50">
        <button
          onClick={() => {
            if (!profile) { router.push('/auth/login'); return }
            setShowOatModal(true)
          }}
          className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Post Oat"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.22)' }}
        >
          <OatsLogo className="w-7 h-7 text-primary-foreground" />
        </button>
      </div>
    </>
  )
}
