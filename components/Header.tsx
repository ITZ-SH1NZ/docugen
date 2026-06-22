'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/templates', label: 'Templates' },
  { href: '/generate', label: 'Generate' },
  { href: '/batches', label: 'Batches' },
];

export default function Header({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Link href="/templates" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1>📄 Document Generator</h1>
        </Link>
        <nav className="nav">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`nav-link${pathname.startsWith(n.href) ? ' active' : ''}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="sub">{email}</span>
        <form action="/auth/signout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </div>
    </header>
  );
}
