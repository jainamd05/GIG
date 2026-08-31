'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Role = 'customer' | 'worker'
const SERVICES = ['Plumbing', 'Electrician', 'Cleaning', 'Carpentry']

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [role, setRole] = useState<Role>('customer')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [skill, setSkill] = useState(SERVICES[0])
  const [location, setLocation] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const metadata: Record<string, string> = { role, full_name: fullName }
    if (role === 'worker') {
      metadata.skill = skill
      metadata.location = location
      metadata.phone = phone
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setCheckEmail(true)
      setLoading(false)
      return
    }

    router.push(role === 'worker' ? '/dashboard/worker' : '/dashboard/customer')
    router.refresh()
  }

  if (checkEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="card max-w-sm w-full text-center">
          <h1 className="text-2xl font-semibold mb-3">Check your email</h1>
          <p className="text-muted">
            We sent a confirmation link to <strong>{email}</strong>. Click it,
            then come back and log in.
          </p>
          <a href="/login" className="btn btn-ghost mt-6">Go to login</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="card max-w-sm w-full">
        <p className="eyebrow mb-2">Cooperative Gig Platform</p>
        <h1 className="text-2xl font-semibold mb-6">Create an account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="field">
            <label>I am a…</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRole('customer')}
                className={`btn flex-1 ${role === 'customer' ? 'btn-primary' : 'btn-ghost'}`}>
                Customer
              </button>
              <button type="button" onClick={() => setRole('worker')}
                className={`btn flex-1 ${role === 'worker' ? 'btn-primary' : 'btn-ghost'}`}>
                Worker
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" type="text" required value={fullName}
              onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>

          {role === 'worker' && (
            <>
              <div className="field">
                <label htmlFor="skill">Your trade</label>
                <select id="skill" value={skill} onChange={(e) => setSkill(e.target.value)}>
                  {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="location">Your service area</label>
                <input id="location" required value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Pune" />
              </div>
              <div className="field">
                <label htmlFor="phone">WhatsApp number</label>
                <input id="phone" required value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91XXXXXXXXXX" />
              </div>
            </>
          )}

          {error && <p className="text-sm text-danger" role="alert">{error}</p>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="text-sm text-muted mt-6">
          Already have an account? <a href="/login" className="underline">Log in</a>
        </p>
      </div>
    </main>
  )
}
