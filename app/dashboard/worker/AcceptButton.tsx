'use client'

import { useState } from 'react'

export default function AcceptButton({ jobCode }: { jobCode: string }) {
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
    return <span className="badge badge-hired">Interest sent ✓</span>
  }

  return (
    <div className="text-right">
      <button onClick={handleAccept} className="btn btn-primary btn-sm" disabled={loading}>
        {loading ? 'Recording…' : "I'm interested"}
      </button>
      {error && <p className="text-xs text-danger mt-1">{error}</p>}
    </div>
  )
}
