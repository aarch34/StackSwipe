'use client';

import React, { useState, useEffect } from 'react';
import {
  UserX,
  AlertTriangle,
  UserCheck,
  Search,
  Clock,
  ShieldAlert,
  Calendar,
  RefreshCw,
  Archive,
} from '@/components/px-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function SuspendedAccountsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'suspended' | 'banned' | 'soft_deleted'>('suspended');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function fetchRestrictedUsers() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/admin/users?status=${tab}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching restricted users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRestrictedUsers();
  }, [tab]);

  async function handleRestore(userId: string, userName: string) {
    setRestoringId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'restore',
          userId,
          reason: 'Administrative reinstatement after safety review',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to restore user');
      }

      toast({
        title: 'Account Restored',
        description: `${userName} has been returned to active standing.`,
      });

      fetchRestrictedUsers();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not restore user account',
        variant: 'destructive',
      });
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Suspension & Ban Management
            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs">
              Enforced Server-Side
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor and manage accounts restricted from swiping, matching, messaging, and discovery.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-white/10 bg-slate-900/80 p-1 text-xs w-fit">
        <button
          onClick={() => setTab('suspended')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            tab === 'suspended'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Temporarily Suspended
        </button>

        <button
          onClick={() => setTab('banned')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            tab === 'banned'
              ? 'bg-red-500/20 text-red-300 border border-red-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserX className="h-4 w-4" />
          Permanently Banned
        </button>

        <button
          onClick={() => setTab('soft_deleted')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
            tab === 'soft_deleted'
              ? 'bg-slate-700 text-slate-200 border border-slate-600 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Archive className="h-4 w-4" />
          Soft-Deleted
        </button>
      </div>

      {/* Table */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-400 py-3.5">User Account</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Account ID</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Moderation Reason</TableHead>
                {tab === 'suspended' && (
                  <TableHead className="text-xs font-semibold text-slate-400">Suspension Expiry</TableHead>
                )}
                <TableHead className="text-xs font-semibold text-slate-400 text-right pr-4">Reinstatement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Loading restricted accounts…
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    No {tab.replace('_', ' ')} accounts found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                          <AvatarImage src={u.photoURL} alt={u.name} />
                          <AvatarFallback className="bg-amber-500/20 text-amber-300 font-bold text-xs">
                            {u.name?.charAt(0) ?? '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate max-w-[180px]">
                          <p className="font-semibold text-xs text-white truncate">{u.name}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="font-mono text-[11px] text-slate-400">
                      {u.id.substring(0, 8)}…
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {u.suspension_reason || u.ban_reason || 'Administrative restriction'}
                      </p>
                    </TableCell>

                    {tab === 'suspended' && (
                      <TableCell className="text-xs text-amber-300 font-mono">
                        {u.suspended_until ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(u.suspended_until).toLocaleDateString()}
                          </div>
                        ) : (
                          'Indefinite'
                        )}
                      </TableCell>
                    )}

                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        onClick={() => handleRestore(u.id, u.name)}
                        disabled={restoringId === u.id}
                        className="h-8 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs gap-1.5 transition-colors"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        {restoringId === u.id ? 'Restoring…' : 'Restore Account'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
