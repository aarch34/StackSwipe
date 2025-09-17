
'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const publicRoutes = ['/login', '/signup', '/'];
const authRoutes = ['/login', '/signup'];

export function AppRouter({ children }: { children: React.ReactNode }) {
    const { user, loading, hasProfile } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (loading) {
            return;
        }

        const isPublicRoute = publicRoutes.includes(pathname);
        const isAuthRoute = authRoutes.includes(pathname);

        if (user) {
            if (isAuthRoute) {
                // If user is logged in and on an auth page, redirect to dashboard or onboarding
                router.replace(hasProfile ? '/dashboard' : '/onboarding');
            } else if (!hasProfile && pathname !== '/onboarding') {
                 // If user is logged in, has no profile, and isn't on onboarding, redirect
                 router.replace('/onboarding');
            }
        } else {
             // If user is not logged in and not on a public route, redirect to login
            if (!isPublicRoute) {
                router.replace('/login');
            }
        }

    }, [user, loading, hasProfile, pathname, router]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <p>Pulling threads to weave your network…</p>
            </div>
        );
    }
    
    return <>{children}</>;
}
