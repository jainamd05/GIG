import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AcceptButtonLarge from './AcceptButtonLarge'

export default async function WorkerJobDetailPage({ params }: { params: { jobCode: string } }) {
  const jobCode = decodeURIComponent(params.jobCode)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/dashboard/worker/jobs/${jobCode}`)}`)
  }

  // Admin client here because a job a worker was notified about may fall
  // just outside their live skill/location match (e.g. they update their
  // profile later) — we still want the deep link to show the job.
  const admin = createAdminClient()
  const { data: job } = await admin
    .from('jobs')
    .select('job_code, service_type, location, description, preferred_time, status')
    .eq('job_code', jobCode)
    .single()

  if (!job) {
    return (
      <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
        <div className="card">
          <h1 className="text-2xl font-semibold mb-3">Job not found</h1>
          <p className="text-muted">This job may have been removed.</p>
        </div>
      </main>
    )
  }

  if (job.status !== 'OPEN') {
    return (
      <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
        <div className="card">
          <h1 className="text-2xl font-semibold mb-3">Job no longer open</h1>
          <p className="text-muted">This job has already been assigned to another worker.</p>
          <a href="/dashboard/worker" className="btn btn-ghost mt-6">Back to dashboard</a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen px-6 py-12 max-w-lg mx-auto">
      <p className="eyebrow mb-2">Job {job.job_code}</p>
      <h1 className="text-3xl font-semibold mb-6">Accept this gig?</h1>

      <div className="card">
        <p className="text-muted mb-1"><strong>Service:</strong> {job.service_type}</p>
        <p className="text-muted mb-1"><strong>Location:</strong> {job.location}</p>
        {job.preferred_time && <p className="text-muted mb-1"><strong>Preferred time:</strong> {job.preferred_time}</p>}
        {job.description && <p className="text-muted mb-6">{job.description}</p>}

        <AcceptButtonLarge jobCode={job.job_code} />
      </div>
    </main>
  )
}
