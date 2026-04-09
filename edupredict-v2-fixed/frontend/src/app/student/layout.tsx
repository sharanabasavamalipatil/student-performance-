'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import Sidebar from '@/components/Sidebar';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) { router.replace('/login'); return; }
    if (role !== 'student') { router.replace('/teacher'); return; }
    setReady(true);
  }, [_hasHydrated, isAuthenticated, role, router]);

  // Show spinner while hydrating — never return null (prevents sign-off loop)
  if (!_hasHydrated || !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen">{children}</main>
    </div>
  );
}
