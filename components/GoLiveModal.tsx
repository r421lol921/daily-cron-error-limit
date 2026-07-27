'use client'

import { useState, useEffect } from 'react'
import type { LiveStream } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onStarted: (stream: LiveStream) => void
}

const CATEGORIES = [
  'Just Chatting',
  'Gaming',
  'Music',
  'Sports',
  'Art',
  'Cooking',
  'Travel',
  'Education',
  'Technology',
]

export default function GoLiveModal({ isOpen, onClose, onStarted }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Just Chatting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null)
  const [checkingUsage, setCheckingUsage] = useState(false)

  // Load daily usage when modal opens
  useEffect(() => {
    if (!isOpen) return
    setCheckingUsage(true)
    fetch('/api/live/start', { method: 'GET' }).catch(() => {})
    // Instead, check via list + check usage manually by trying start with a dry-run
    // We'll just show remaining time once user clicks start
    setMinutesRemaining(null)
    setCheckingUsage(false)
  }, [isOpen])

  async function handleStart() {
    if (!title.trim()) { setError('Please enter a title for your stream.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/live/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), category }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403) {
          setError("You've used your 10-minute daily live limit. Come back tomorrow.")
        } else if (res.status === 409) {
          setError('You already have an active stream.')
        } else {
          setError(data.error || 'Failed to start stream.')
        }
        return
      }
      setMinutesRemaining(data.minutesRemaining)
      onStarted(data.stream)
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl mobile-modal sm:animate-none">
        {/* Handle bar */}
        <div className="flex justify-center mb-5 sm:hidden">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                <circle cx="12" cy="12" r="6" />
              </svg>
            </div>
            <h2 className="font-black text-lg text-foreground">Go Live</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition text-foreground-secondary"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Daily budget info */}
        <div className="flex items-center gap-2 mb-5 px-3 py-2.5 rounded-xl bg-muted text-xs text-foreground-secondary">
          <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 8v4l2 2" />
          </svg>
          <span>
            Live streams are limited to <strong className="text-foreground">10 minutes per day</strong> to keep data costs low. Quality auto-adjusts over time.
          </span>
        </div>

        {/* Title input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-1.5">
            Stream Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What are you streaming today?"
            maxLength={80}
            className="w-full input-squared text-sm"
            autoFocus
          />
        </div>

        {/* Category picker */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-1.5">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                  category === cat
                    ? 'bg-red-600 text-white'
                    : 'bg-muted text-foreground-secondary hover:bg-foreground/10 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive mb-4 font-medium">{error}</p>
        )}

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={loading || !title.trim()}
          className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
              <circle cx="12" cy="12" r="5" className="animate-ping absolute opacity-40" />
              <circle cx="12" cy="12" r="5" />
            </svg>
          )}
          {loading ? 'Starting...' : 'Start Streaming'}
        </button>
      </div>
    </div>
  )
}
