'use client'

import { useState } from 'react'

const SERVICES = ['Plumbing', 'Electrician', 'Cleaning', 'Carpentry']

export default function RequestGigPage() {
  const [form, setForm] = useState({
    customerContact: '',
    location: '',
    serviceType: SERVICES[0],
    description: '',
    preferredTime: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ jobId: string } | null>(null)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch('/api/gigs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    setResult({ jobId: data.jobId })
    setLoading(false)
  }

  if (result) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
        <div className="card text-center">
          <h1 className="text-2xl font-semibold mb-3">Request sent</h1>
          <p className="text-muted mb-2">
            We've notified eligible cooperative workers. You'll see responses
            on your dashboard as they come in.
          </p>
          <p className="text-sm mb-6">Job ID: <code>{result.jobId}</code></p>
          <div className="flex gap-3 justify-center">
            <a href={`/dashboard/customer/jobs/${encodeURIComponent(result.jobId)}`} className="btn btn-primary">
              View interested workers
            </a>
            <a href="/dashboard/customer" className="btn btn-ghost">Back to dashboard</a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
      <p className="eyebrow mb-2">New request</p>
      <h1 className="text-3xl font-semibold mb-8">Request a gig</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="field">
          <label htmlFor="customerContact">Contact number</label>
          <input id="customerContact" required value={form.customerContact}
            onChange={(e) => update('customerContact', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="location">Location</label>
          <input id="location" required value={form.location}
            onChange={(e) => update('location', e.target.value)} placeholder="e.g. Pune" />
        </div>
        <div className="field">
          <label htmlFor="serviceType">Service needed</label>
          <select id="serviceType" value={form.serviceType} onChange={(e) => update('serviceType', e.target.value)}>
            {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="description">Describe the problem</label>
          <textarea id="description" rows={4} value={form.description}
            onChange={(e) => update('description', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="preferredTime">Preferred time</label>
          <input id="preferredTime" value={form.preferredTime}
            onChange={(e) => update('preferredTime', e.target.value)}
            placeholder="e.g. Tomorrow morning" />
        </div>

        {error && <p className="text-sm text-danger" role="alert">{error}</p>}

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </main>
  )
}
