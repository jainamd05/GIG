import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// SERVER-ONLY. Bypasses Row Level Security entirely using the service_role
// key. Only import this inside app/api/** route handlers, and only after
// you've manually verified the caller's identity/authorization — this
// client trusts every query it's given.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
