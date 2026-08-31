import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AcceptButton from './AcceptButton'

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'HIRED' ? 'badge-hired' : status === 'RELEASED' ? 'badge-released' : 'badge-interested'
  return <span className={`badge ${cls}`}>{status}</span>
}

export default async function WorkerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'worker') redirect('/dashboard/customer')

  // RLS restricts this to OPEN jobs matching this worker's own skill/location.
  const { data: openJobs } = await supabase
    .from('jobs')
    .select('job_code, service_type, location, description, created_at')
    .eq('status', 'OPEN')
    .order('created_at', { ascending: false })

  const { data: myInterests } = await supabase
    .from('interests')
    .select('status, accepted_at, jobs(job_code, service_type, location, status)')
    .eq('worker_id', user.id)
    .order('accepted_at', { ascending: false })

  const openJobCodes = new Set((openJobs || []).map((j) => j.job_code))
  const alreadyAppliedCodes = new Set(
    (myInterests || [])
      .map((i) => (Array.isArray(i.jobs) ? i.jobs[0] : i.jobs)?.job_code)
      .filter(Boolean)
  )

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <p className="eyebrow mb-2">Worker dashboard</p>
      <h1 className="text-3xl font-semibold mb-8">
        Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
      </h1>

      <div className="card mb-6">
        <h2 className="text-xl font-semibold mb-4">Open jobs near you</h2>

        {(!openJobs || openJobs.length === 0) && (
          <p className="text-muted">No open jobs matching your trade and area right now.</p>
        )}

        {openJobs?.map((job) => (
          <div key={job.job_code} className="job-row">
            <div>
              <p className="font-semibold">{job.service_type} · {job.location}</p>
              <p className="text-sm text-muted">{job.description || job.job_code}</p>
            </div>
            {alreadyAppliedCodes.has(job.job_code) ? (
              <span className="badge badge-hired">Interest sent ✓</span>
            ) : (
              <AcceptButton jobCode={job.job_code} />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your responses</h2>

        {(!myInterests || myInterests.length === 0) && (
          <p className="text-muted">You haven't responded to any jobs yet.</p>
        )}

        {myInterests?.map((interest, idx) => {
          const job = Array.isArray(interest.jobs) ? interest.jobs[0] : interest.jobs
          if (!job) return null
          return (
            <div key={idx} className="job-row">
              <div>
                <p className="font-semibold">{job.service_type} · {job.location}</p>
                <p className="text-sm text-muted">{job.job_code}</p>
              </div>
              <StatusBadge status={interest.status} />
            </div>
          )
        })}
      </div>
    </main>
  )
}
