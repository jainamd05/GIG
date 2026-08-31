// Shared helpers used by the /api/gigs/* route handlers.

export function generateJobCode() {
  const rand = Math.floor(100 + Math.random() * 900)
  return `JOB-${Date.now()}-${rand}`
}

export function jobUrl(jobCode: string, role: 'worker' | 'customer') {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return role === 'worker'
    ? `${base}/dashboard/worker/jobs/${encodeURIComponent(jobCode)}`
    : `${base}/dashboard/customer/jobs/${encodeURIComponent(jobCode)}`
}
