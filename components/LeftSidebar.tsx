'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
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
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMenu])

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
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
      ),
    },
    {
      href: '/discover',
      label: 'Discover',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      href: profile ? `/profile/${profile.username}` : '/home',
      label: 'Profile',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      href: '/bookmarks',
      label: 'Bookmarks',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      ),
    },
    {
      href: '/clips',
      label: 'Clips',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      href: '/stats',
      label: 'Stats',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* Desktop/tablet left sidebar — slim icon-only column */}
      <header className="fixed left-0 top-0 h-screen z-40 hidden sm:flex flex-col bg-background border-r border-border w-16">
        <div className="flex flex-col h-full w-full py-3 px-2 gap-1">

          {/* Logo */}
          <Link
            href="/home"
            className="flex items-center justify-center w-10 h-10 mx-auto mb-2 rounded-xl hover:bg-foreground/8 transition flex-shrink-0"
            aria-label="Home"
          >
            <Image src="/ghost-logo.png" alt="Logo" width={32} height={32} className="w-8 h-8 object-contain" />
          </Link>

          {/* New Post button */}
          <button
            onClick={() => {
              if (!profile) { router.push('/auth/login'); return }
              setShowOatModal(true)
            }}
            className="flex items-center justify-center w-10 h-10 mx-auto mb-1 bg-foreground/10 hover:bg-foreground/15 rounded-xl transition"
            title="New Clip"
            aria-label="New Clip"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          {/* Divider */}
          <div className="h-px bg-border mx-2 my-1" />

          {/* Nav items */}
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition ${
                    active
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-foreground-secondary hover:bg-foreground/8 hover:text-foreground'
                  }`}
                  title={label}
                  aria-label={label}
                >
                  {icon(active)}
                </Link>
              )
            })}
          </nav>

          {/* Divider */}
          <div className="h-px bg-border mx-2 my-1" />

          {/* Bottom: theme toggle + account */}
          <div className="flex flex-col gap-1 items-center">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-foreground/8 transition text-foreground-secondary hover:text-foreground"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 0l1.42-1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42m12.72 0l1.42 1.42" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* User account button + animated menu */}
            {profile && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(v => !v)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-foreground/8 transition"
                  title="Account"
                  aria-label="Account menu"
                  aria-expanded={showMenu}
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-border">
                    <Image
                      src={profile.avatar_url || DEFAULT_AVATAR}
                      alt={profile.display_name}
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                </button>

                {/* Animated menu — opens upward, left-flush with sidebar */}
                <div
                  className={`absolute bottom-full left-full ml-2 mb-1 w-56 bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden z-50 origin-bottom-left transition-all duration-200 ${
                    showMenu
                      ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                      : 'opacity-0 scale-95 translate-y-1 pointer-events-none'
                  }`}
                >
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-bold text-foreground text-sm truncate">{profile.display_name}</p>
                    <p className="text-foreground-secondary text-xs truncate">@{profile.username}</p>
                  </div>
                  <Link
                    href={`/profile/${profile.username}`}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-foreground hover:bg-foreground/8 transition text-sm"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                    </svg>
                    View profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-foreground hover:bg-foreground/8 transition text-sm"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-1 safe-area-pb">
        {[navItems[0], navItems[1], navItems[4], navItems[2], navItems[3]].map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-h-[52px] rounded-xl transition active:scale-90 ${
                active ? 'text-foreground' : 'text-foreground-secondary'
              }`}
              aria-label={label}
            >
              <span className={`transition-transform ${active ? 'scale-105' : ''}`}>
                {icon(active)}
              </span>
              <span className={`text-[10px] font-semibold`}>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Floating compose button — mobile only */}
      <div className="sm:hidden fixed bottom-[68px] right-4 z-50">
        <button
          onClick={() => {
            if (!profile) { router.push('/auth/login'); return }
            setShowOatModal(true)
          }}
          className="w-13 h-13 w-[52px] h-[52px] bg-foreground text-background rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
          aria-label="New Clip"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {showOatModal && profile && (
        <OatUploadModal
          profile={profile}
          onClose={() => setShowOatModal(false)}
          onPosted={() => { setShowOatModal(false); router.refresh() }}
        />
      )}
    </>
  )
}
