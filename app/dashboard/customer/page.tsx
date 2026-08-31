import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'ASSIGNED' ? 'badge-assigned' : 'badge-open'
  return <span className={`badge ${cls}`}>{status}</span>
}

export default async function CustomerDashboard() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'customer') redirect('/dashboard/worker')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('job_code, service_type, location, status, created_at, assigned_worker_id, profiles:assigned_worker_id(full_name)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="eyebrow mb-2">Customer dashboard</p>
          <h1 className="text-3xl font-semibold">
            Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
        </div>
        <a href="/dashboard/customer/request" className="btn btn-primary">Request a gig</a>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Your requests</h2>

        {(!jobs || jobs.length === 0) && (
          <p className="text-muted">You haven't requested anything yet.</p>
        )}

        {jobs?.map((job) => {
          const assignedTo = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles
          return (
            <div key={job.job_code} className="job-row">
              <div>
                <p className="font-semibold">{job.service_type} · {job.location}</p>
                <p className="text-sm text-muted">
                  {job.job_code}
                  {assignedTo?.full_name ? ` · Assigned to ${assignedTo.full_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={job.status} />
                {job.status === 'OPEN' && (
                  <a href={`/dashboard/customer/jobs/${encodeURIComponent(job.job_code)}`} className="btn btn-ghost btn-sm">
                    Review workers
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
