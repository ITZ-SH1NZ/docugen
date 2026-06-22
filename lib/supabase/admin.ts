import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. SERVER ONLY (worker + storage signing).
// Never import this into a client component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
