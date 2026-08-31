import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { sendWhatsApp } from '@/lib/whatsapp'
import { generateJobCode, jobUrl } from '@/lib/jobs'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'customer') {
    return NextResponse.json({ error: 'Only customers can request a gig' }, { status: 403 })
  }

  const body = await req.json()
  const { customerContact, serviceType, location, description, preferredTime } = body
  if (!customerContact || !serviceType || !location) {
    return NextResponse.json({ error: 'customerContact, serviceType, and location are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const jobCode = generateJobCode()

  const { data: job, error: insertError } = await admin
    .from('jobs')
    .insert({
      job_code: jobCode,
      customer_id: user.id,
      customer_name: profile.full_name,
      customer_contact: customerContact,
      customer_email: profile.email,
      service_type: serviceType,
      location,
      description: description || null,
      preferred_time: preferredTime || null,
      status: 'OPEN',
    })
    .select()
    .single()

  if (insertError || !job) {
    console.error(insertError)
    return NextResponse.json({ error: 'Could not save the job request' }, { status: 500 })
  }

  // Notifications are awaited (not fire-and-forget) so they reliably
  // complete on serverless hosts, which can freeze a function the instant
  // a response is returned. Wrapped in try/catch so a notification failure
  // (e.g. the confirmation email) can never turn an already-successful job
  // creation into a 500 response.
  try {
    await notifyEligibleWorkers(admin, job, profile)
  } catch (err) {
    console.error('notifyEligibleWorkers failed', err)
  }

  return NextResponse.json({
    jobId: jobCode,
    jobStatus: 'OPEN',
    message: 'Gig request received.',
  })
}

async function notifyEligibleWorkers(
  admin: ReturnType<typeof createAdminClient>,
  job: { job_code: string; service_type: string; location: string; description: string | null; preferred_time: string | null; customer_name: string; customer_contact: string; customer_email: string },
  customerProfile: { full_name: string | null; email: string | null }
) {
  const now = new Date().toISOString()

  const { data: candidates } = await admin
    .from('worker_details')
    .select('id, cooldown_until, profiles!inner(full_name, email, phone)')
    .eq('skill', job.service_type)
    .eq('location', job.location)
    .eq('is_active_member', true)

  const eligible = (candidates || []).filter(
    (w) => !w.cooldown_until || w.cooldown_until <= now
  )

  const link = jobUrl(job.job_code, 'worker')

  await Promise.allSettled(
    eligible.map(async (w) => {
      const worker = Array.isArray(w.profiles) ? w.profiles[0] : w.profiles
      if (!worker?.email) return

      await sendEmail({
        to: worker.email,
        subject: `New ${job.service_type} gig near you`,
        html: `<h3>Hi ${worker.full_name || 'there'},</h3>
          <p>A customer needs a <b>${job.service_type}</b> in <b>${job.location}</b>.</p>
          <p>${job.description || ''}</p>
          <p><a href="${link}">View the job and accept it</a></p>`,
      })

      if (worker.phone) {
        try {
          await sendWhatsApp(
            worker.phone,
            `New ${job.service_type} gig in ${job.location}. View and accept: ${link}`
          )
        } catch (err) {
          console.error('WhatsApp send failed for', worker.phone, err)
        }
      }
    })
  )

  if (customerProfile.email) {
    await sendEmail({
      to: customerProfile.email,
      subject: 'Your gig request was sent',
      html: `<h3>Hi ${customerProfile.full_name || 'there'},</h3>
        <p>We've notified ${eligible.length} eligible cooperative worker(s) about your
        <b>${job.service_type}</b> request in <b>${job.location}</b>.</p>
        <p>You'll see responses on your dashboard as workers accept.</p>
        <p>Job ID: ${job.job_code}</p>`,
    })
  }
}
