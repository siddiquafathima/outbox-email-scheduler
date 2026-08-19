'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

interface SidebarUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  const initial = user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?';

  return (
    <aside className="w-64 h-screen border-r border-brand-border flex flex-col p-4">
      <div className="text-2xl font-black tracking-tight mb-6">ONB</div>

      <div className="flex items-center gap-3 mb-6 p-2 rounded-lg hover:bg-brand-gray transition">
        {user.image ? (
          <img src={user.image} alt={user.name || 'User'} className="w-9 h-9 rounded-full" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-green flex items-center justify-center text-white text-sm font-semibold">
            {initial}
          </div>
        )}
        <div className="flex flex-col overflow-hidden flex-1">
          <span className="text-sm font-medium text-gray-900 truncate">{user.name}</span>
          <span className="text-xs text-gray-400 truncate">{user.email}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-xs text-gray-400 hover:text-red-500"
          title="Logout"
        >
          ⎋
        </button>
      </div>

      <Link
        href="/dashboard/compose"
        className="w-full text-center border border-brand-green text-brand-green font-medium py-2 rounded-full mb-6 hover:bg-brand-green-light transition"
      >
        Compose
      </Link>

      <div className="text-xs font-medium text-gray-400 mb-2 px-2">CORE</div>

      <nav className="flex flex-col gap-1">
        <Link
          href="/dashboard/scheduled"
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
            isActive('/dashboard/scheduled')
              ? 'bg-brand-green-light text-brand-green font-medium'
              : 'text-gray-700 hover:bg-brand-gray'
          }`}
        >
          <span className="flex items-center gap-2">
            <ClockIcon />
            Scheduled
          </span>
        </Link>

        <Link
          href="/dashboard/sent"
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
            isActive('/dashboard/sent')
              ? 'bg-brand-green-light text-brand-green font-medium'
              : 'text-gray-700 hover:bg-brand-gray'
          }`}
        >
          <span className="flex items-center gap-2">
            <SentIcon />
            Sent
          </span>
        </Link>
      </nav>
    </aside>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function SentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}
