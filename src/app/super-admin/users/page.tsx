'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserCheck,
  UserX,
  AlertTriangle,
  ShieldAlert,
  MoreVertical,
  Calendar,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  MessageSquare,
  Flame,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from '@/components/px-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function UserManagementPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected User Drawer / Dialog state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);
  const [userDetailData, setUserDetailData] = useState<any | null>(null);

  // Moderation Action Confirmation Dialog
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'suspend' | 'ban' | 'restore' | 'soft_delete' | 'warning' | null
  >(null);
  const [actionReason, setActionReason] = useState('');
  const [suspensionDuration, setSuspensionDuration] = useState('7');
  const [actionExecuting, setActionExecuting] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const queryParams = new URLSearchParams({
        search,
        status: statusFilter,
        sort: sortBy,
        page: page.toString(),
        limit: '12',
      });

      const res = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading users', description: err.error || 'Failed to fetch users', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [search, statusFilter, sortBy, page]);

  async function openUserDetails(user: any) {
    setSelectedUser(user);
    setLoadingUserDetail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/admin/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUserDetailData(data);
      }
    } catch (err) {
      console.error('Error fetching user detail:', err);
    } finally {
      setLoadingUserDetail(false);
    }
  }

  function initiateAction(
    action: 'suspend' | 'ban' | 'restore' | 'soft_delete' | 'warning',
    user: any
  ) {
    setSelectedUser(user);
    setPendingAction(action);
    setActionReason('');
    setActionModalOpen(true);
  }

  async function executeModerationAction() {
    if (!selectedUser || !pendingAction) return;

    if (!actionReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'You must provide a documented reason for this action.',
        variant: 'destructive',
      });
      return;
    }

    setActionExecuting(true);
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
          action: pendingAction,
          userId: selectedUser.id,
          reason: actionReason.trim(),
          durationDays: pendingAction === 'suspend' ? parseInt(suspensionDuration, 10) : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to execute moderation action');
      }

      toast({
        title: 'Action Applied',
        description: `Successfully executed ${pendingAction} on user ${selectedUser.name}.`,
      });

      setActionModalOpen(false);
      fetchUsers();
      if (userDetailData) {
        openUserDetails(selectedUser);
      }
    } catch (err: any) {
      toast({
        title: 'Action Failed',
        description: err.message || 'Could not complete moderation action.',
        variant: 'destructive',
      });
    } finally {
      setActionExecuting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            User Management
            <Badge className="bg-slate-800 text-slate-300 font-mono text-xs border border-white/10">
              {totalCount} Total Accounts
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, inspect profiles, audit developer activity, and enforce moderation.
          </p>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              type="text"
              placeholder="Search by name, email, or user ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-slate-950/60 border-white/10 text-xs text-slate-100 placeholder:text-slate-500 rounded-xl focus-visible:ring-emerald-500"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-950/60 border-white/10 text-xs text-slate-200 rounded-xl">
                <SelectValue placeholder="Account Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="suspended">Suspended Only</SelectItem>
                <SelectItem value="banned">Permanently Banned</SelectItem>
                <SelectItem value="soft_deleted">Soft-Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-4">
            <Select
              value={sortBy}
              onValueChange={(val) => {
                setSortBy(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-950/60 border-white/10 text-xs text-slate-200 rounded-xl">
                <SelectValue placeholder="Sort Order" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-xs">
                <SelectItem value="newest">Newest Registered</SelectItem>
                <SelectItem value="oldest">Oldest Registered</SelectItem>
                <SelectItem value="last_active">Recently Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-400 py-3.5">Developer</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">User ID</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Registered</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-center">Swipes</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-center">Matches</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-center">Reports</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-6 w-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                      Loading user records…
                    </div>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    No user accounts found matching your query.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const statusMap: Record<string, string> = {
                    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    banned: 'bg-red-500/10 text-red-500 border-red-500/30',
                    soft_deleted: 'bg-slate-800 text-slate-400 border-slate-700',
                  };
                  const statusBadge = statusMap[u.account_status] || statusMap.active;

                  return (
                    <TableRow
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Developer Profile Column */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-white/10 shrink-0">
                            <AvatarImage src={u.photoURL} alt={u.name} />
                            <AvatarFallback className="bg-emerald-500/20 text-emerald-300 font-bold text-xs">
                              {u.name?.charAt(0) ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate max-w-[180px]">
                            <p className="font-semibold text-xs text-white truncate">{u.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* User ID */}
                      <TableCell className="font-mono text-[11px] text-slate-400">
                        <span title={u.id}>{u.id.substring(0, 8)}…</span>
                      </TableCell>

                      {/* Registered Date */}
                      <TableCell className="text-xs text-slate-300">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono capitalize border ${statusBadge}`}
                        >
                          {u.account_status || 'active'}
                        </Badge>
                      </TableCell>

                      {/* Swipes */}
                      <TableCell className="text-center font-mono text-xs text-slate-300">
                        {u.totalSwipes}
                      </TableCell>

                      {/* Matches */}
                      <TableCell className="text-center font-mono text-xs text-slate-300">
                        {u.totalMatches}
                      </TableCell>

                      {/* Reports */}
                      <TableCell className="text-center">
                        {u.reportCount > 0 ? (
                          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-[10px]">
                            {u.reportCount} reports
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">0</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openUserDetails(u)}
                            className="h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-white/5 gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-emerald-400" />
                            View
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-white"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-slate-900 border-white/10 text-xs w-48"
                            >
                              <DropdownMenuLabel className="text-[10px] font-mono text-slate-500 uppercase">
                                Moderation
                              </DropdownMenuLabel>
                              {u.account_status !== 'suspended' && (
                                <DropdownMenuItem
                                  onClick={() => initiateAction('suspend', u)}
                                  className="text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 mr-2" />
                                  Suspend Account
                                </DropdownMenuItem>
                              )}
                              {u.account_status !== 'banned' && (
                                <DropdownMenuItem
                                  onClick={() => initiateAction('ban', u)}
                                  className="text-red-400 hover:bg-red-500/10 cursor-pointer"
                                >
                                  <UserX className="h-3.5 w-3.5 mr-2" />
                                  Permanently Ban
                                </DropdownMenuItem>
                              )}
                              {u.account_status !== 'active' && (
                                <DropdownMenuItem
                                  onClick={() => initiateAction('restore', u)}
                                  className="text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                >
                                  <UserCheck className="h-3.5 w-3.5 mr-2" />
                                  Restore to Active
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => initiateAction('warning', u)}
                                className="text-yellow-300 hover:bg-yellow-500/10 cursor-pointer"
                              >
                                <AlertCircle className="h-3.5 w-3.5 mr-2" />
                                Issue Warning
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => initiateAction('soft_delete', u)}
                                className="text-slate-400 hover:bg-white/5 cursor-pointer"
                              >
                                Soft-Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span>
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 border-white/10 text-xs text-slate-300 hover:bg-white/5"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 border-white/10 text-xs text-slate-300 hover:bg-white/5"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* INDIVIDUAL USER DETAIL DRAWER / DIALOG */}
      <Dialog open={Boolean(selectedUser && !actionModalOpen)} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border border-white/10">
                  <AvatarImage src={selectedUser?.photoURL} alt={selectedUser?.name} />
                  <AvatarFallback className="bg-emerald-500/20 text-emerald-300 font-bold">
                    {selectedUser?.name?.charAt(0) ?? '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedUser?.name}
                    {selectedUser?.age && (
                      <span className="text-sm font-normal text-slate-400">({selectedUser.age})</span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-400 font-mono">
                    ID: {selectedUser?.id}
                  </DialogDescription>
                </div>
              </div>

              <Badge
                variant="outline"
                className={`text-xs font-mono capitalize border ${
                  selectedUser?.account_status === 'banned'
                    ? 'bg-red-500/10 text-red-400 border-red-500/30'
                    : selectedUser?.account_status === 'suspended'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {selectedUser?.account_status || 'active'}
              </Badge>
            </div>
          </DialogHeader>

          {loadingUserDetail ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading comprehensive user dossier…
            </div>
          ) : userDetailData ? (
            <div className="space-y-6 pt-2">
              {/* Profile Details Grid */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Profile Information
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Email:</span>
                    <p className="font-medium text-slate-200">{userDetailData.user.email}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Headline:</span>
                    <p className="font-medium text-slate-200">{userDetailData.user.headline || '—'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Role / Company:</span>
                    <p className="font-medium text-slate-200">
                      {userDetailData.user.jobTitle || 'Developer'}
                      {userDetailData.user.company ? ` @ ${userDetailData.user.company}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Location:</span>
                    <p className="font-medium text-slate-200">{userDetailData.user.location || '—'}</p>
                  </div>
                </div>

                {userDetailData.user.bio && (
                  <div className="text-xs pt-1 border-t border-white/5">
                    <span className="text-slate-500">Bio:</span>
                    <p className="text-slate-300 mt-0.5 italic">&quot;{userDetailData.user.bio}&quot;</p>
                  </div>
                )}
              </div>

              {/* Platform Activity Counters */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                  <Flame className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{userDetailData.activity.totalSwipes}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Swipes</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                  <Users className="h-4 w-4 text-pink-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{userDetailData.activity.totalMatches}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Matches</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                  <MessageSquare className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{userDetailData.activity.totalMessages}</p>
                  <p className="text-[10px] text-slate-400 font-mono">Messages</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-900/80 p-3 text-center">
                  <Sparkles className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-white">{userDetailData.activity.aiIcebreakerUsage}</p>
                  <p className="text-[10px] text-slate-400 font-mono">AI Sparks</p>
                </div>
              </div>

              {/* Safety & Report History */}
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                  <span>Reports Against User ({userDetailData.reports?.length ?? 0})</span>
                  {userDetailData.user.warning_count > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-[10px]">
                      {userDetailData.user.warning_count} Warnings Issued
                    </Badge>
                  )}
                </h4>

                {userDetailData.reports?.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No reports filed against this user.</p>
                ) : (
                  <div className="space-y-2">
                    {userDetailData.reports.map((r: any) => (
                      <div
                        key={r.id}
                        className="rounded-xl border border-white/5 bg-slate-950/60 p-2.5 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-red-400 capitalize">
                            {r.category.replace('_', ' ')}
                          </span>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{r.description || 'No description provided'}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                          {r.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Action Toolbar */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-white/10">
                {selectedUser.account_status !== 'suspended' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => initiateAction('suspend', selectedUser)}
                    className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                    Suspend
                  </Button>
                )}

                {selectedUser.account_status !== 'banned' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => initiateAction('ban', selectedUser)}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs"
                  >
                    <UserX className="h-3.5 w-3.5 mr-1.5" />
                    Permanently Ban
                  </Button>
                )}

                {selectedUser.account_status !== 'active' && (
                  <Button
                    size="sm"
                    onClick={() => initiateAction('restore', selectedUser)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  >
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                    Restore Account
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* CONFIRMATION DIALOG FOR DESTRUCTIVE ACTIONS */}
      <Dialog open={actionModalOpen} onOpenChange={setActionModalOpen}>
        <DialogContent className="max-w-md bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <ShieldAlert className="h-5 w-5 text-red-500" />
              <DialogTitle className="text-base font-bold capitalize">
                Confirm {pendingAction} Action
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              You are about to execute a moderation action on{' '}
              <span className="font-semibold text-white">{selectedUser?.name}</span>. This action will be logged in the immutable audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            {pendingAction === 'suspend' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Suspension Duration</Label>
                <Select value={suspensionDuration} onValueChange={setSuspensionDuration}>
                  <SelectTrigger className="bg-slate-900 border-white/10 text-xs">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-xs">
                    <SelectItem value="1">1 Day</SelectItem>
                    <SelectItem value="3">3 Days</SelectItem>
                    <SelectItem value="7">7 Days (Default)</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">
                Documented Reason <span className="text-red-400">*</span>
              </Label>
              <Textarea
                placeholder="Specify the reason for this administrative moderation action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                rows={3}
                className="bg-slate-900 border-white/10 text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionModalOpen(false)}
              disabled={actionExecuting}
              className="border-white/10 text-xs text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={executeModerationAction}
              disabled={actionExecuting}
              className={`text-xs text-white ${
                pendingAction === 'ban'
                  ? 'bg-red-600 hover:bg-red-700'
                  : pendingAction === 'suspend'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {actionExecuting ? 'Executing…' : `Confirm ${pendingAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
