import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/templates';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Redirect to the correct next destination (usually /templates)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with an error message
  return NextResponse.redirect(`${origin}/login?error=Authentication callback failed`);
}
