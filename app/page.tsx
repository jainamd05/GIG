import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'worker') redirect('/dashboard/worker')
    if (profile?.role === 'customer') redirect('/dashboard/customer')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <p className="eyebrow mb-3">Cooperative Gig Platform</p>
        <h1 className="text-4xl font-semibold mb-4 leading-tight">
          Work that stays in the neighborhood.
        </h1>
        <p className="text-muted mb-8 leading-relaxed">
          A customer posts a job. Every eligible cooperative worker gets the
          same chance to take it — no algorithm plays favorites.
        </p>
        <div className="flex gap-3">
          <a href="/login" className="btn btn-primary">Log in</a>
          <a href="/signup" className="btn btn-ghost">Create an account</a>
        </div>
      </div>
    </main>
  )
}
