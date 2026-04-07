'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface Props {
  urls: string[]
  initialIndex?: number
  onClose: () => void
}

export default function MediaViewer({ urls, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const videoRef = useRef<HTMLVideoElement>(null)
  const current = urls[index]
  const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(current) || current.includes('video')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex(i => Math.min(urls.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, urls.length])

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center viewer-backdrop"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Prev */}
      {urls.length > 1 && index > 0 && (
        <button
          onClick={e => { e.stopPropagation(); setIndex(i => i - 1) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
          aria-label="Previous"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      {/* Next */}
      {urls.length > 1 && index < urls.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); setIndex(i => i + 1) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition"
          aria-label="Next"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {/* Media */}
      <div
        className="viewer-img max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={current}
            className="max-w-full max-h-[88vh] rounded-xl object-contain"
            controls
            autoPlay
            loop
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current}
            alt="Media"
            className="max-w-full max-h-[88vh] rounded-xl object-contain select-none"
            draggable={false}
          />
        )}
      </div>

      {/* Dots indicator */}
      {urls.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {urls.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i) }}
              className={`w-2 h-2 rounded-full transition ${i === index ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Go to ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
