'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  UserX,
  Flame,
  MessageSquare,
  Sparkles,
  BarChart3,
  Bell,
  UserCog,
  FileText,
  Settings,
  Search,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
} from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { AdminUser } from '@/lib/admin-auth';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  superAdminOnly?: boolean;
}

const navItems: NavItem[] = [
  { name: 'Overview', href: '/super-admin', icon: LayoutDashboard },
  { name: 'Users', href: '/super-admin/users', icon: Users },
  { name: 'Reports & Safety', href: '/super-admin/reports', icon: ShieldAlert },
  { name: 'Suspended / Banned', href: '/super-admin/suspended', icon: UserX },
  { name: 'Swipes & Matches', href: '/super-admin/swipes-matches', icon: Flame },
  { name: 'Messaging Analytics', href: '/super-admin/messages', icon: MessageSquare },
  { name: 'AI Icebreakers', href: '/super-admin/ai-icebreakers', icon: Sparkles },
  { name: 'Platform Analytics', href: '/super-admin/analytics', icon: BarChart3 },
  { name: 'Admin Notifications', href: '/super-admin/notifications', icon: Bell },
  { name: 'Admin Roles', href: '/super-admin/roles', icon: UserCog, superAdminOnly: true },
  { name: 'Audit Logs', href: '/super-admin/audit-logs', icon: FileText },
  { name: 'Settings', href: '/super-admin/settings', icon: Settings, superAdminOnly: true },
];

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [databaseAccess, setDatabaseAccess] = useState(true);

  // If we are on the login page, don't show the admin dashboard shell
  const isLoginPage = pathname === '/super-admin/login';


  useEffect(() => {
    if (isLoginPage) {
      setCheckingAuth(false);
      return;
    }

    async function verifyAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace('/super-admin/login');
          return;
        }

        const res = await fetch('/api/admin/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          router.replace('/super-admin/login');
          return;
        }

        const data = await res.json();
        setAdminUser(data.adminUser);
        setDatabaseAccess(data.databaseAccess !== false);

        // Fetch unread notifications count
        try {
          const notifRes = await fetch('/api/admin/notifications', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (notifRes.ok) {
            const notifData = await notifRes.json();
            setUnreadNotifications(notifData.unreadCount || 0);
          }
        } catch {
          // Non-blocking
        }
      } catch (err) {
        console.error('Error verifying admin session:', err);
        router.replace('/super-admin/login');
      } finally {
        setCheckingAuth(false);
      }
    }

    verifyAdmin();
  }, [pathname, isLoginPage, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/super-admin/login');
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Shield className="h-10 w-10 text-primary animate-pulse" />
        <div className="flex flex-col items-center">
          <p className="font-headline text-2xl font-semibold text-white">StackSwipe Super Admin</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">Authorizing session clearance…</p>
        </div>
      </div>
    );
  }

  const roleBadgeColor = {
    super_admin: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    moderator: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    support_admin: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    analyst: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  }[adminUser?.role || 'analyst'];

  const roleDisplayName = {
    super_admin: 'Super Admin',
    moderator: 'Moderator',
    support_admin: 'Support Admin',
    analyst: 'Analyst',
  }[adminUser?.role || 'analyst'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 min-h-screen">
        {/* SIDEBAR NAVIGATION */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 border-r-4 border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 backdrop-blur-xl',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
            <Link href="/super-admin" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground group-hover:-translate-y-0.5 transition-transform duration-100">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline text-2xl font-bold leading-none text-white flex items-center gap-1.5">
                  StackSwipe
                  <span className="font-label text-[10px] font-normal px-1.5 py-0.5 bg-accent text-accent-foreground">
                    ADM
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Control Center</span>
              </div>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links (12 Sections) */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
              Management & Safety
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/super-admin'
                  ? pathname === '/super-admin'
                  : pathname.startsWith(item.href);

              // Hide Super Admin only items if not super_admin
              if (item.superAdminOnly && adminUser?.role !== 'super_admin') {
                return null;
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        isActive
                          ? 'text-accent-foreground'
                          : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.href === '/super-admin/notifications' && unreadNotifications > 0 && (
                    <Badge className="bg-red-500 text-white font-mono text-[10px] px-1.5 py-0">
                      {unreadNotifications}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User App Link & Admin Session Footer */}
          <div className="p-3 border-t border-white/10 space-y-2">
            <Link
              href="/dashboard"
              target="_blank"
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                Live User App
              </span>
              <ChevronRight className="h-3 w-3 text-slate-600" />
            </Link>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/5">
              <div className="flex items-center gap-2.5 truncate">
                <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {adminUser?.name?.charAt(0) || 'A'}
                  </AvatarFallback>
                </Avatar>
                <div className="truncate">
                  <p className="text-xs font-semibold text-white truncate">{adminUser?.name}</p>
                  <span
                    className={cn(
                      'inline-block px-1.5 py-0.2 rounded text-[10px] font-mono border',
                      roleBadgeColor
                    )}
                  >
                    {roleDisplayName}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title="Sign out of Admin Dashboard"
                className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* TOPBAR */}
          <header className="h-16 border-b border-white/10 bg-slate-950 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Quick Jump Search */}
              <div className="relative hidden sm:block w-64 md:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Quick search users, reports, IDs..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val.trim()) {
                        router.push(`/super-admin/users?search=${encodeURIComponent(val.trim())}`);
                      }
                    }
                  }}
                  className="pl-9 h-8 bg-slate-900/60 border-white/10 text-xs text-slate-200 placeholder:text-slate-500 rounded-lg focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notification Bell Badge */}
              <Link href="/super-admin/notifications">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5"
                >
                  <Bell className="h-4 w-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                      {unreadNotifications > 9 ? '9+' : unreadNotifications}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Staff Pill */}
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/10">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-mono font-medium border flex items-center gap-1.5',
                    roleBadgeColor
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {roleDisplayName}
                </span>
                <span className="text-xs text-slate-400 font-mono truncate max-w-[150px]">
                  {adminUser?.email}
                </span>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {!databaseAccess && (
                <div role="alert" className="border-2 border-amber-500 bg-amber-500/10 p-4 text-sm text-foreground">
                  <p className="font-semibold">This account can open the admin panel but cannot read admin data yet.</p>
                  <p className="mt-1">
                    It is on the SUPER_ADMIN_EMAILS list but has no admin_users row, so reports, users and metrics will look
                    empty. Run supabase/add_admins.sql in the Supabase SQL Editor with this email included, then reload.
                  </p>
                </div>
              )}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
