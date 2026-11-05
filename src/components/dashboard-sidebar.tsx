'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  MessageSquare,
  Sparkles,
  User,
  LogOut,
  Heart,
} from '@/components/px-icons';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { CommunityPrinciplesDialog } from '@/components/community-principles';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Icons } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const menuItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Swipe' },
  { href: '/dashboard/messages', icon: MessageSquare, label: 'Messages' },
  
  {
    href: '/dashboard/recommendations',
    icon: Sparkles,
    label: 'StackBot',
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { counts } = useUnreadCounts();
  const unreadTotal = Object.values(counts).reduce((total, count) => total + count, 0);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const activeIndex = menuItems.findIndex((item) => isActive(item.href));

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Icons.logo className="size-8" />
          <span className="font-headline text-3xl font-bold">
            StackSwipe
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="relative">
        {/* Butter block that slides to the current tab */}
        {activeIndex >= 0 && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-10 bg-accent transition-transform duration-200 ease-out"
            style={{ transform: `translateY(${activeIndex * 44}px)` }}
          />
        )}
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={{ children: item.label, side: 'right' }}
                className="relative z-10 transition-transform duration-100 hover:translate-x-1 data-[active=true]:bg-transparent"
              >
                <Link href={item.href} prefetch={true}>
                  <item.icon />
                  <span>{item.label}</span>
                  {item.href === '/dashboard/messages' && unreadTotal > 0 && (
                    <span className="ml-auto border-2 bg-primary px-1.5 text-xs font-semibold leading-tight text-primary-foreground">
                      {unreadTotal}
                      <span className="sr-only"> unread</span>
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        </div>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
         <SidebarMenu>
           {profile && (
            <SidebarMenuItem>
               <div className="flex items-center gap-3 p-2">
                  <Avatar className="size-8">
                      <AvatarImage src={profile.photoURL} alt={profile.name} />
                      <AvatarFallback>{profile.name?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{profile.name}</span>
               </div>
            </SidebarMenuItem>
           )}
          <SidebarMenuItem>
            <CommunityPrinciplesDialog
              trigger={
                <SidebarMenuButton tooltip={{ children: 'Community principles', side: 'right' }}>
                  <Heart />
                  <span>Community principles</span>
                </SidebarMenuButton>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/profile')}
              tooltip={{ children: "Edit Profile", side: 'right' }}
            >
              <Link href="/dashboard/profile" prefetch={true}>
                <User />
                <span>Edit Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                }}
                tooltip={{ children: "Logout", side: 'right' }}
              >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
