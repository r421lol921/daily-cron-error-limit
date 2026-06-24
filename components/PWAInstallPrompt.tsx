'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Platform = 'ios' | 'chrome' | null

export default function PWAInstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if already dismissed this session
    const wasDismissed = sessionStorage.getItem('pwa-prompt-dismissed')
    if (wasDismissed) return

    // Don't show if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as any).standalone === true) return

    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream
    const isChrome = /chrome/i.test(ua) && !/edge|opr\//i.test(ua) && !isIOS

    if (isIOS) {
      // Show iOS Safari prompt after a short delay
      setTimeout(() => {
        setPlatform('ios')
        setVisible(true)
      }, 3000)
    } else if (isChrome) {
      // Listen for Chrome's beforeinstallprompt event
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e)
        setTimeout(() => {
          setPlatform('chrome')
          setVisible(true)
        }, 3000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  function handleDismiss() {
    setVisible(false)
    setDismissed(true)
    sessionStorage.setItem('pwa-prompt-dismissed', '1')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
      setDismissed(true)
    }
    setDeferredPrompt(null)
  }

  if (!visible || dismissed || !platform) return null

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[9999] sm:hidden"
      role="dialog"
      aria-label="Install Faundry.buzz app"
    >
      <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3 p-4">
          <div className="w-11 h-11 rounded-xl bg-foreground flex items-center justify-center flex-shrink-0">
            <Image src="/ghost-logo.png" alt="Faundry" width={28} height={28} className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            {platform === 'ios' ? (
              <>
                <p className="font-bold text-foreground text-base leading-tight">Hey, Want the app?</p>
                <p className="text-foreground-secondary text-sm mt-0.5 leading-relaxed">
                  Tap <span className="inline-flex items-center gap-0.5 font-semibold text-primary">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Share
                  </span>{' '}then <strong className="text-foreground">Add to Home Screen</strong> for the full experience.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-foreground text-base leading-tight">Install Faundry.buzz</p>
                <p className="text-foreground-secondary text-sm mt-0.5">Add to your home screen for the full app experience.</p>
              </>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-foreground/10 transition text-foreground-secondary flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {platform === 'chrome' && (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-foreground/5 transition"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 py-2 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition"
            >
              Install
            </button>
          </div>
        )}
        {platform === 'ios' && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-foreground-secondary flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-foreground-secondary">Only available on Safari on iOS</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
