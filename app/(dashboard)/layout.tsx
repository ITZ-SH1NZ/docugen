import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar Shell */}
      <Sidebar email={user.email ?? ''} />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen flex flex-col">
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
