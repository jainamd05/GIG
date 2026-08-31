import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest, { params }: { params: { jobCode: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('id, customer_id')
    .eq('job_code', params.jobCode)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.customer_id !== user.id) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 })
  }

  const { data: interests, error } = await admin
    .from('interests')
    .select('worker_id, status, accepted_at, profiles!inner(full_name, email)')
    .eq('job_id', job.id)
    .eq('status', 'INTERESTED')

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Could not load interested workers' }, { status: 500 })
  }

  const workers = (interests || []).map((i) => {
    const p = Array.isArray(i.profiles) ? i.profiles[0] : i.profiles
    return {
      workerId: i.worker_id,
      workerName: p?.full_name,
      workerEmail: p?.email,
      acceptedAt: i.accepted_at,
    }
  })

  return NextResponse.json({ workers })
}
