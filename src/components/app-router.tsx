'use client';

import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const publicRoutes = ['/', '/auth', '/login', '/signup'];
const authRoutes = ['/auth', '/login', '/signup'];

export function AppRouter({ children }: { children: React.ReactNode }) {
    const { user, loading, profile, onboardingCompleted } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || loading) {
            return;
        }

        // Admin dashboard has its own dedicated authentication system and RBAC guard
        if (pathname.startsWith('/super-admin')) {
            return;
        }

        const isPublicRoute = publicRoutes.includes(pathname);
        const isAuthRoute = authRoutes.includes(pathname);
        const isCompleted = Boolean(
            profile?.onboarding_completed ||
            onboardingCompleted ||
            (typeof window !== 'undefined' && user && localStorage.getItem(`stackswipe_onboarding_${user.id}`)?.includes('"onboarding_completed":true'))
        );

        if (user) {
            if (isAuthRoute) {
                // User is authenticated and on an auth page -> redirect to app or onboarding
                router.replace(isCompleted ? '/dashboard' : '/onboarding');
            } else if (!isCompleted && pathname !== '/onboarding' && !isPublicRoute) {
                // Route protection: Cannot access dashboard/discovery before finishing onboarding
                router.replace('/onboarding');
            } else if (isCompleted && pathname === '/onboarding') {
                // Prevent showing onboarding again if already completed
                router.replace('/dashboard');
            }
        } else {
            // Unauthenticated user trying to access a protected page
            if (!isPublicRoute) {
                router.replace('/login');
            }
        }
    }, [user, loading, profile, onboardingCompleted, pathname, router, mounted]);

    // Admin dashboard handles its own rendering and protection
    if (pathname.startsWith('/super-admin')) {
        return <>{children}</>;
    }

    const isPublicRoute = publicRoutes.includes(pathname);

    // On public routes (e.g. landing page '/', '/login', '/signup'), always render children directly.
    // This completely eliminates hydration mismatches between SSR and client.
    if (isPublicRoute) {
        return <>{children}</>;
    }

    // On protected routes (e.g. /dashboard, /onboarding), display a loading screen while auth is resolving
    if (!mounted || loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm font-medium text-muted-foreground">Checking your profile & network status…</p>
                </div>
            </div>
        );
    }
    
    return <>{children}</>;
}

