'use client'

import { useEffect, useState } from 'react'

/**
 * Detects whether the visitor is coming from a Spectrum ISP.
 * Uses ipapi.co (free, no-key tier) to check the ISP/org field.
 * Shows a full-screen blocking modal if Spectrum is detected.
 */
export default function SpectrumBlockPopup() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    async function detectSpectrum() {
      try {
        const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const org: string = (data.org ?? '').toLowerCase()
        const isp: string = (data.isp ?? '').toLowerCase()
        const asn: string = (data.asn ?? '').toLowerCase()
        const isSpectrum =
          org.includes('spectrum') ||
          isp.includes('spectrum') ||
          asn.includes('spectrum') ||
          org.includes('charter') ||
          isp.includes('charter') ||
          asn.includes('charter') ||
          org.includes('as11426') ||
          org.includes('as12271') ||
          asn.includes('as11426') ||
          asn.includes('as12271')
        if (isSpectrum) setShow(true)
      } catch {
        // Silently fail — never block non-Spectrum users due to network errors
      }
    }
    detectSpectrum()
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(0,0,0,0.75)' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="spectrum-title"
      aria-describedby="spectrum-desc"
    >
      <div className="relative max-w-lg w-full mx-6 rounded-2xl border border-red-800/60 bg-[#0d0d0d] shadow-2xl px-8 py-10 flex flex-col items-center text-center gap-6">
        {/* Red accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-red-600" aria-hidden="true" />

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-600/30 flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        {/* Headline */}
        <h2
          id="spectrum-title"
          className="text-3xl font-black tracking-tight text-white"
          style={{ fontFamily: 'var(--font-outfit, sans-serif)' }}
        >
          Spectrum, It Is Too Late.
        </h2>

        {/* Body */}
        <p
          id="spectrum-desc"
          className="text-base leading-relaxed text-neutral-300"
        >
          Spectrum has tried to censor and silence sites throughout the 2020&apos;s.
          So in regards to this, we are <strong className="text-white">DONE.</strong>{' '}
          Spectrum is being silenced.
        </p>

        {/* Divider */}
        <div className="w-full border-t border-red-900/40" aria-hidden="true" />

        {/* CTA */}
        <button
          onClick={() => window.close()}
          className="rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 transition px-8 py-3 font-bold text-white text-sm tracking-wide"
        >
          Close Tab
        </button>
      </div>
    </div>
  )
}
