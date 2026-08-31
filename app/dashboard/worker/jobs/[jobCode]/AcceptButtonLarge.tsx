'use client'

import { useState } from 'react'

export default function AcceptButtonLarge({ jobCode }: { jobCode: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleAccept() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/gigs/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not record your interest')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div>
        <p className="text-primary font-semibold mb-2">Interest recorded ✓</p>
        <p className="text-sm text-muted">
          The customer will review everyone who's interested and choose a
          worker. You'll be notified if you're chosen.
        </p>
      </div>
    )
  }

  return (
    <div>
      <button onClick={handleAccept} className="btn btn-primary" disabled={loading}>
        {loading ? 'Recording…' : "Yes, I'm interested"}
      </button>
      {error && <p className="text-sm text-danger mt-3" role="alert">{error}</p>}
    </div>
  )
}
