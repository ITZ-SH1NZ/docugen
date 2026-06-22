import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';

// Server-side Supabase client bound to the request cookies. RLS is enforced
// because it acts as the signed-in user. Use in Server Components and route
// handlers. (Next 15: cookies() is async.)
// Cached per-request to avoid duplicate initializations.
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; the middleware
            // refreshes the session cookie on the response.
          }
        },
      },
    },
  );
});

// Returns the signed-in user or null. Cached per-request to prevent duplicate auth fetches.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
