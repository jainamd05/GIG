import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { jobCode, workerId } = await req.json()
  if (!jobCode || !workerId) {
    return NextResponse.json({ error: 'jobCode and workerId are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: job } = await admin
    .from('jobs')
    .select('id, job_code, customer_id, customer_name, customer_email, service_type, location, status')
    .eq('job_code', jobCode)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  if (job.customer_id !== user.id) {
    return NextResponse.json({ error: 'Not your job' }, { status: 403 })
  }
  if (job.status !== 'OPEN') {
    return NextResponse.json({ error: 'This job has already been assigned' }, { status: 409 })
  }

  const { data: chosenWorkerProfile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', workerId)
    .single()

  if (!chosenWorkerProfile) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  // Assign the job.
  const { error: jobUpdateError } = await admin
    .from('jobs')
    .update({ status: 'ASSIGNED', assigned_worker_id: workerId })
    .eq('id', job.id)

  if (jobUpdateError) {
    console.error(jobUpdateError)
    return NextResponse.json({ error: 'Could not assign the job' }, { status: 500 })
  }

  // Put the chosen worker on a 12h cooldown before they're eligible for a
  // new shortlist again (keeps job distribution fair), and bump their
  // completed-job counter.
  const { data: wd } = await admin
    .from('worker_details')
    .select('recent_jobs')
    .eq('id', workerId)
    .single()

  const cooldownUntil = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString()
  await admin
    .from('worker_details')
    .update({ cooldown_until: cooldownUntil, recent_jobs: (wd?.recent_jobs || 0) + 1 })
    .eq('id', workerId)

  // Mark interests: chosen -> HIRED, everyone else on this job -> RELEASED.
  await admin.from('interests').update({ status: 'HIRED' }).eq('job_id', job.id).eq('worker_id', workerId)
  await admin.from('interests').update({ status: 'RELEASED' }).eq('job_id', job.id).neq('worker_id', workerId)

  // Notify — best effort, never blocks the response.
  try {
    if (chosenWorkerProfile.email) {
      await sendEmail({
        to: chosenWorkerProfile.email,
        subject: `You've been assigned a ${job.service_type} gig`,
        html: `<h3>Hello ${chosenWorkerProfile.full_name || 'there'},</h3>
          <p>A customer has selected you for a cooperative gig. Congratulations!</p>
          <ul>
            <li><b>Job ID:</b> ${job.job_code}</li>
            <li><b>Service:</b> ${job.service_type}</li>
            <li><b>Location:</b> ${job.location}</li>
            <li><b>Customer:</b> ${job.customer_name}</li>
          </ul>
          <p>You'll be paused from new shortlists for the next 12 hours to keep job distribution fair.</p>`,
      })
    }
    if (job.customer_email) {
      await sendEmail({
        to: job.customer_email,
        subject: `Your ${job.service_type} gig has been assigned`,
        html: `<h3>Hi ${job.customer_name},</h3>
          <p>You hired <b>${chosenWorkerProfile.full_name}</b> for job ${job.job_code}. They'll be in touch shortly.</p>`,
      })
    }
  } catch (err) {
    console.error('Hire notification email failed', err)
  }

  return NextResponse.json({
    jobId: job.job_code,
    workerId,
    workerName: chosenWorkerProfile.full_name,
    status: 'assigned',
  })
}
