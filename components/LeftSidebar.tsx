'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import PenguinLogo from './PenguinLogo'
import PostModal from './PostModal'
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
  const [showPostModal, setShowPostModal] = useState(false)

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
      href: '/clips',
      label: 'Clips',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      href: '/groups',
      label: 'Groups',
      icon: (active: boolean) => (
        <svg viewBox="0 0 24 24" className="w-7 h-7" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
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
      {/* Desktop/tablet left sidebar */}
      <header className="fixed left-0 top-0 h-screen z-40 flex-col items-end pr-2 xl:w-[275px] w-[88px] bg-background hidden sm:flex">
        <div className="flex flex-col h-full w-full xl:items-start items-center py-2 gap-1 xl:px-3">
          {/* Logo */}
          <Link href="/home" className="p-3 rounded-full hover:bg-foreground/10 transition mb-2">
            <PenguinLogo className="w-8 h-8 text-foreground" />
          </Link>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 w-full">
            {navItems.map(({ href, label, icon }) => {
              const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-4 p-3 rounded-full transition hover:bg-foreground/10 ${active ? 'font-bold' : ''}`}
                >
                  <span className="text-foreground">{icon(active)}</span>
                  <span className="hidden xl:block text-xl text-foreground">{label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Post button */}
          <button
            onClick={() => {
              if (!profile) { router.push('/auth/login'); return }
              // If on home and composer visible, focus it; otherwise open modal
              const composer = document.getElementById('post-composer')
              if (composer && pathname === '/home') {
                composer.focus()
                window.scrollTo({ top: 0, behavior: 'smooth' })
              } else {
                setShowPostModal(true)
              }
            }}
            className="mt-2 xl:w-[90%] w-12 h-12 xl:h-auto flex items-center justify-center xl:justify-start gap-3 bg-primary text-primary-foreground rounded-full xl:px-6 xl:py-3 font-bold text-lg transition hover:bg-primary/90 active:bg-primary/80"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 xl:hidden" fill="currentColor">
              <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round" stroke="currentColor" strokeWidth="2.5" fill="none"/>
            </svg>
            <span className="hidden xl:block">Post</span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-4 p-3 rounded-full transition hover:bg-foreground/10 w-full xl:justify-start justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
            <span className="hidden xl:block text-foreground">
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>

          {/* User account */}
          {profile && (
            <div className="relative w-full">
              <button
                onClick={() => setShowMenu(m => !m)}
                className="flex items-center gap-3 p-3 rounded-full hover:bg-foreground/10 transition w-full xl:justify-start justify-center"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-muted">
                  <Image
                    src={profile.avatar_url || DEFAULT_AVATAR}
                    alt={profile.display_name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover w-full h-full"
                    unoptimized
                  />
                </div>
                <div className="hidden xl:flex flex-col items-start min-w-0 flex-1">
                  <span className="font-bold text-sm text-foreground truncate max-w-[120px]">{profile.display_name}</span>
                  <span className="text-foreground-secondary text-sm truncate max-w-[120px]">@{profile.username}</span>
                </div>
                <svg className="hidden xl:block w-5 h-5 text-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </button>
              {showMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-popover border border-border rounded-2xl shadow-xl w-72 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-bold text-foreground">{profile.display_name}</p>
                    <p className="text-foreground-secondary text-sm">@{profile.username}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 text-foreground hover:bg-foreground/10 transition font-bold"
                  >
                    Sign out @{profile.username}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Global post modal */}
      {showPostModal && profile && (
        <PostModal
          profile={profile}
          onClose={() => setShowPostModal(false)}
          onPosted={() => { setShowPostModal(false); router.refresh() }}
        />
      )}

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border flex items-center justify-around px-2 py-1 safe-area-pb">
        {/* Show only 5 most important nav items on mobile */}
        {[navItems[0], navItems[1], navItems[2], navItems[3], navItems[4]].map(({ href, label, icon }) => {
          const active = pathname === href || (href !== '/home' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition active:bg-foreground/10 ${active ? 'text-primary' : 'text-foreground-secondary'}`}
              aria-label={label}
            >
              <span className={active ? 'text-primary' : 'text-foreground-secondary'}>{icon(active)}</span>
            </Link>
          )
        })}
        {/* Post button on mobile */}
        <button
          onClick={() => {
            if (!profile) { router.push('/auth/login'); return }
            setShowPostModal(true)
          }}
          className="flex items-center justify-center w-11 h-11 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 active:bg-primary/80 transition"
          aria-label="Post"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </nav>
    </>
  )
}
