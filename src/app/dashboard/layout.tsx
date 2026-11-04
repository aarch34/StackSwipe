
'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Globe } from '@/components/px-icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuth } from '@/hooks/use-auth';
import { ShieldAlert, AlertTriangle, LogOut } from '@/components/px-icons';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, logout } = useAuth();

  const isRestricted =
    profile?.account_status === 'suspended' ||
    profile?.account_status === 'banned' ||
    profile?.account_status === 'soft_deleted';

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        <div className="h-screen max-h-screen flex flex-col overflow-hidden">
          <header className="flex-shrink-0 h-14 flex justify-end items-center px-4 gap-2 border-b-4 bg-background z-10">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Globe className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">Change language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem disabled>Kannada</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div className="bg-grid flex-1 min-h-0 overflow-y-auto flex flex-col">
            {isRestricted ? (
              <div className="dark flex flex-1 items-center justify-center bg-background p-6 text-foreground">
                <div className="max-w-md w-full px-raised bg-card p-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                    {profile?.account_status === 'banned' ? (
                      <ShieldAlert className="h-8 w-8 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-amber-400" />
                    )}
                  </div>

                  <h2 className="text-xl font-extrabold text-white">
                    {profile?.account_status === 'banned'
                      ? 'Account Permanently Banned'
                      : 'Account Temporarily Suspended'}
                  </h2>

                  <p className="mt-3 text-xs sm:text-sm text-slate-300">
                    {profile?.account_status === 'banned'
                      ? 'This account has been permanently banned due to severe or repeated violations of the StackSwipe Community Guidelines.'
                      : 'Your access to swiping, matching, messaging, and AI features is temporarily suspended by moderation.'}
                  </p>

                  {profile?.account_status === 'suspended' && profile?.suspended_until && (
                    <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 font-medium">
                      Suspension active until:{' '}
                      <span className="font-bold text-white">
                        {new Date(profile.suspended_until).toLocaleDateString()} at{' '}
                        {new Date(profile.suspended_until).toLocaleTimeString()}
                      </span>
                    </div>
                  )}

                  {(profile?.suspension_reason || profile?.ban_reason) && (
                    <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-400 text-left">
                      <span className="font-semibold text-slate-200">Moderation Reason:</span>
                      <p className="mt-1 text-slate-300 italic">
                        &quot;{profile?.suspension_reason || profile?.ban_reason}&quot;
                      </p>
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={() => logout()}
                      className="gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                    <p className="text-[11px] text-slate-500 mt-2">
                      If you believe this was an error, please reach out to safety@stackswipe.com with your user ID: {profile?.id}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
