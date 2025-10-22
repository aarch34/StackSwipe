'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid,
  MessageSquare,
  Sparkles,
  User,
  LogOut,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
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
  { href: '/dashboard/community', icon: Users, label: 'Community' }, // 🎯 Added this line
  {
    href: '/dashboard/recommendations',
    icon: Sparkles,
    label: 'AI Recommendations',
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Icons.logo className="size-8 text-primary" />
          <span className="font-headline text-xl font-semibold">
            StackSwipe
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={{ children: item.label, side: 'right' }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
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
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/profile')}
              tooltip={{ children: "Edit Profile", side: 'right' }}
            >
              <Link href="/dashboard/profile">
                <User />
                <span>Edit Profile</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
                onClick={logout}
                tooltip={{ children: "Logout", side: 'right' }}
              >
                  <LogOut />
                  <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
