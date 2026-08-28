'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/bookings', label: 'Bookings' },
    { href: '/admin/calendar', label: 'Calendar' },
    { href: '/admin/payments', label: 'Payments' },
    { href: '/admin/content', label: 'Content' },
    { href: '/admin/settings', label: 'Settings' },
    { href: '/admin/audit-log', label: 'Audit log' },
    { href: '/admin/security', label: 'Security' },
  ];

  return (
    <header className="border-b border-corner-border bg-corner-ink text-corner-bg print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="font-display text-lg">Gordon&rsquo;s Corner — Admin</span>
          <nav className="flex gap-6 text-sm">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname?.startsWith(link.href)
                    ? 'text-white'
                    : 'text-corner-bg/60 hover:text-white'
                }
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <button onClick={signOut} className="text-sm text-corner-bg/60 hover:text-white">
          Sign out
        </button>
      </div>
    </header>
  );
}
