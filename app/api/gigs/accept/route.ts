import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'worker') {
    return NextResponse.json({ error: 'Only workers can accept a gig' }, { status: 403 })
  }

  const { jobCode } = await req.json()
  if (!jobCode) return NextResponse.json({ error: 'jobCode is required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('id, status')
    .eq('job_code', jobCode)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.status !== 'OPEN') {
    return NextResponse.json({ error: 'This job is no longer open' }, { status: 409 })
  }

  // worker_id is taken from the authenticated session, never from the
  // request body — a worker can only ever register interest as themselves.
  const { error: insertError } = await admin
    .from('interests')
    .insert({ job_id: job.id, worker_id: user.id, status: 'INTERESTED' })

  if (insertError) {
    // Unique constraint on (job_id, worker_id) — they already accepted.
    if (insertError.code === '23505') {
      return NextResponse.json({ jobId: jobCode, status: 'interest_recorded' })
    }
    console.error(insertError)
    return NextResponse.json({ error: 'Could not record your interest' }, { status: 500 })
  }

  return NextResponse.json({ jobId: jobCode, status: 'interest_recorded' })
}
