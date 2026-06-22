'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Layers, FolderOpen, Settings, HelpCircle, LogOut, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/batches', label: 'Generations', icon: Layers },
  { href: '/assets', label: 'Assets', icon: FolderOpen },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-sm">
            D
          </div>
          <span className="font-bold text-xl text-text tracking-tight">DocuGen</span>
        </Link>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-btn text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-muted hover:text-text'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-text-secondary'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pinned bottom support and user profile */}
      <div className="p-4 border-t border-border space-y-4">
        {/* Help & Support */}
        <Link
          href="/help"
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-muted rounded-btn transition-all"
        >
          <HelpCircle className="w-4 h-4 shrink-0 text-text-secondary" />
          <span>Help & Support</span>
        </Link>

        {/* User Card */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-border">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary-soft border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0 uppercase">
              {email.slice(0, 2)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-text truncate">{email.split('@')[0]}</span>
              <span className="text-[10px] text-text-muted truncate">{email}</span>
            </div>
          </div>
          <form action="/auth/signout" method="post" className="shrink-0">
            <button
              type="submit"
              className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-all"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
