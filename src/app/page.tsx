
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function HomePage() {
  const router = useRouter();
  const { user, loading, hasProfile } = useAuth();

  useEffect(() => {
    if (loading) {
      return; // Wait until loading is false
    }

    if (!user) {
      router.replace('/login');
      return;
    }

    if (hasProfile) {
      router.replace('/dashboard');
    } else {
      router.replace('/onboarding');
    }
  }, [user, loading, hasProfile, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Pulling threads to weave your network…</p>
    </div>
  );
}
