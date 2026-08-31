'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Worker = { workerId: string; workerName: string; workerEmail: string; acceptedAt: string }

export default function ChooseWorkerPage() {
  const params = useParams<{ jobCode: string }>()
  const jobCode = decodeURIComponent(params.jobCode)

  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hiring, setHiring] = useState<string | null>(null)
  const [hired, setHired] = useState<{ workerName: string } | null>(null)

  async function loadWorkers() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gigs/${encodeURIComponent(jobCode)}/interested`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load workers')
      setWorkers(data.workers || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCode])

  async function handleHire(worker: Worker) {
    setHiring(worker.workerId)
    setError(null)
    try {
      const res = await fetch('/api/gigs/hire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobCode, workerId: worker.workerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not confirm the hire')
      setHired({ workerName: worker.workerName })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setHiring(null)
    }
  }

  if (hired) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-semibold mb-3">Worker assigned</h1>
          <p className="text-muted mb-6">
            You've hired <strong>{hired.workerName}</strong> for this job.
            They've been notified and will be in touch.
          </p>
          <a href="/dashboard/customer" className="btn btn-primary">Back to dashboard</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
      <p className="eyebrow mb-2">Job {jobCode}</p>
      <h1 className="text-3xl font-semibold mb-8">Choose your worker</h1>

      {loading && <p className="text-muted">Loading interested workers…</p>}
      {error && <p className="text-sm text-danger mb-4" role="alert">{error}</p>}

      {!loading && !error && workers.length === 0 && (
        <div className="card">
          <p className="text-muted mb-4">
            No workers have expressed interest yet. Check back soon — this
            page updates as they respond.
          </p>
          <button onClick={loadWorkers} className="btn btn-ghost">Refresh</button>
        </div>
      )}

      <div className="space-y-3">
        {workers.map((w) => (
          <div key={w.workerId} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold">{w.workerName}</p>
              <p className="text-sm text-muted">{w.workerEmail}</p>
            </div>
            <button onClick={() => handleHire(w)} className="btn btn-accent" disabled={hiring !== null}>
              {hiring === w.workerId ? 'Assigning…' : 'Hire'}
            </button>
          </div>
        ))}
      </div>

      {!loading && workers.length > 0 && (
        <button onClick={loadWorkers} className="btn btn-ghost mt-6">Refresh list</button>
      )}
    </main>
  )
}
