'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Bot,
  Sparkles,
  Info,
  CheckCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');

  async function fetchNotifications() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setNotifications(json.notifications || []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading notifications', description: err.error || 'Failed to fetch notifications', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function markAllRead() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (res.ok) {
        toast({ title: 'Success', description: 'All notifications marked as read.' });
        fetchNotifications();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }

  async function toggleReadStatus(id: string, currentStatus: boolean) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationId: id, isRead: !currentStatus }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: !currentStatus } : n))
        );
      }
    } catch (err) {
      console.error('Error toggling read status:', err);
    }
  }

  const filtered = notifications.filter((n) => {
    if (priorityFilter === 'all') return true;
    return n.priority === priorityFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Admin Notification Center
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-mono text-xs">
              {notifications.filter((n) => !n.is_read).length} Unread
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time incident dispatch, multi-report escalations, and system health alerts.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={markAllRead}
          className="border-white/10 text-xs text-slate-300 hover:text-white gap-1.5"
        >
          <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
          Mark All Read
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex rounded-xl border border-white/10 bg-slate-900/80 p-1 text-xs w-fit">
        {['all', 'critical', 'high', 'medium', 'low'].map((p) => (
          <button
            key={p}
            onClick={() => setPriorityFilter(p)}
            className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
              priorityFilter === p
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden p-4">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading notifications…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 italic">
            No notifications found in this priority queue.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => {
              const priorityMap: Record<string, string> = {
                critical: 'bg-red-500/20 text-red-400 border-red-500/40',
                high: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
                medium: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                low: 'bg-slate-800 text-slate-400 border-slate-700',
              };
              const priorityBadge = priorityMap[n.priority] || priorityMap.medium;

              const iconMap: Record<string, React.ReactNode> = {
                multiple_reports: <ShieldAlert className="h-5 w-5 text-red-400" />,
                new_report: <AlertTriangle className="h-5 w-5 text-amber-400" />,
                safety_alert: <ShieldAlert className="h-5 w-5 text-red-500" />,
                suspicious_activity: <Bot className="h-5 w-5 text-amber-400" />,
                ai_error: <Sparkles className="h-5 w-5 text-purple-400" />,
                system_alert: <Info className="h-5 w-5 text-sky-400" />,
              };
              const icon = iconMap[n.type] || <Bell className="h-5 w-5 text-slate-400" />;

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    n.is_read
                      ? 'border-white/5 bg-slate-950/40 opacity-75'
                      : 'border-white/10 bg-slate-950/90 shadow-md ring-1 ring-emerald-500/20'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-white/5 shrink-0 mt-0.5">
                      {icon}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{n.title}</h4>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono uppercase border ${priorityBadge}`}
                        >
                          {n.priority}
                        </Badge>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>

                      <p className="text-xs text-slate-300">{n.message}</p>

                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono pt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {n.metadata?.report_id && (
                      <Link href="/super-admin/reports">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[11px] border-white/10 text-slate-300 hover:text-white"
                        >
                          View Report
                        </Button>
                      </Link>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleReadStatus(n.id, n.is_read)}
                      className="h-7 text-[11px] text-slate-400 hover:text-white"
                    >
                      {n.is_read ? 'Mark Unread' : 'Mark Read'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
