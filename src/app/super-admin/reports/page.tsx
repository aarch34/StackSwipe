'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  MessageSquare,
  UserX,
  FileText,
  UserCheck,
  ChevronRight,
  Shield,
  AlertCircle,
} from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function ReportsManagementPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Selected Report for Review
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionChoice, setActionChoice] = useState<'none' | 'warning' | 'suspend' | 'ban'>('none');
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  // Message Context Modal
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [investigatedMessages, setInvestigatedMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const queryParams = new URLSearchParams({
        status: statusFilter,
        category: categoryFilter,
      });

      const res = await fetch(`/api/admin/reports?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading reports', description: err.error || 'Failed to fetch reports', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, [statusFilter, categoryFilter]);

  function openReportModal(report: any) {
    setSelectedReport(report);
    setAdminNotes(report.admin_notes || '');
    setActionChoice('none');
    setActionReason('');
  }

  async function inspectMessages(report: any) {
    setLoadingMessages(true);
    setContextModalOpen(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(
        `/api/admin/messages?reportId=${report.id}&reason=${encodeURIComponent('Moderation report investigation')}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setInvestigatedMessages(data.investigatedMessages || []);
      }
    } catch (err) {
      console.error('Error loading message context:', err);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function resolveReport(newStatus: 'resolved' | 'dismissed' | 'escalated' | 'under_review') {
    if (!selectedReport) return;
    setIsSubmittingResolution(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status: newStatus,
          adminNotes: adminNotes.trim(),
          action: actionChoice !== 'none' ? actionChoice : undefined,
          reason: actionReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update report');
      }

      toast({
        title: 'Report Updated',
        description: `Report marked as ${newStatus}.`,
      });

      setSelectedReport(null);
      fetchReports();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not update report',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingResolution(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Safety & Report Management
            <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 font-mono text-xs">
              {reports.filter((r) => r.status === 'pending').length} Pending
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review user-submitted safety grievances, inspect message evidence, and take action.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-white/10 bg-slate-900/80 p-1 text-xs">
          {['all', 'pending', 'under_review', 'resolved', 'dismissed', 'escalated'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                statusFilter === st
                  ? 'bg-red-600/20 text-red-300 border border-red-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="w-56">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-slate-900/80 border-white/10 text-xs text-slate-200">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-xs">
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="harassment">Harassment</SelectItem>
              <SelectItem value="inappropriate_behaviour">Inappropriate Behaviour</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
              <SelectItem value="scamming">Scamming</SelectItem>
              <SelectItem value="fake_profile">Fake Profile</SelectItem>
              <SelectItem value="unwanted_messages">Unwanted Messages</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports Table */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-400 py-3.5">Reported User</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Reporter</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Category</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Date Filed</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-center">Alerts</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-right pr-4">Review</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    Loading reports queue…
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    No reports found matching the selected filter.
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((r) => {
                  const statusMap: Record<string, string> = {
                    pending: 'bg-red-500/10 text-red-400 border-red-500/30',
                    under_review: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    dismissed: 'bg-slate-800 text-slate-400 border-slate-700',
                    escalated: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
                  };
                  const statusColor = statusMap[r.status] || statusMap.pending;

                  return (
                    <TableRow
                      key={r.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Reported User */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                            <AvatarImage src={r.reported?.photo_url} alt={r.reported?.name} />
                            <AvatarFallback className="bg-red-500/20 text-red-300 font-bold text-xs">
                              {r.reported?.name?.charAt(0) ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate max-w-[150px]">
                            <p className="font-semibold text-xs text-white truncate">{r.reported?.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{r.reported?.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Reporter */}
                      <TableCell>
                        <div className="truncate max-w-[140px]">
                          <p className="text-xs text-slate-300 font-medium truncate">{r.reporter?.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{r.reporter?.email}</p>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span className="text-xs font-medium text-slate-200 capitalize">
                          {r.category.replace('_', ' ')}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono capitalize border ${statusColor}`}
                        >
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-slate-400">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>

                      {/* Duplicate Report Alert Badge */}
                      <TableCell className="text-center">
                        {r.totalReportsOnUser > 1 ? (
                          <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 font-mono text-[10px]">
                            {r.totalReportsOnUser} Reports
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">1st</span>
                        )}
                      </TableCell>

                      {/* Review Action */}
                      <TableCell className="text-right pr-4">
                        <Button
                          size="sm"
                          onClick={() => openReportModal(r)}
                          className="h-7 px-2.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs transition-colors"
                        >
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* REPORT INVESTIGATION & RESOLUTION DIALOG */}
      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-xl bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <ShieldAlert className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Investigate Report: {selectedReport?.category?.replace('_', ' ')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              Report ID: {selectedReport?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 pt-2">
              {/* Reporter vs Reported Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                    Reporting User
                  </span>
                  <p className="text-xs font-bold text-white mt-1">{selectedReport.reporter?.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{selectedReport.reporter?.email}</p>
                </div>

                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <span className="text-[10px] uppercase font-mono text-red-400 font-semibold">
                    Reported User ({selectedReport.totalReportsOnUser} reports)
                  </span>
                  <p className="text-xs font-bold text-white mt-1">{selectedReport.reported?.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{selectedReport.reported?.email}</p>
                </div>
              </div>

              {/* Grievance Description */}
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">
                  Report Description
                </span>
                <p className="text-xs text-slate-200 mt-1.5 whitespace-pre-wrap">
                  {selectedReport.description || 'No additional narrative was submitted with this report.'}
                </p>
              </div>

              {/* Message Context Inspector Action */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 p-3">
                <div className="text-xs">
                  <span className="font-semibold text-white">Conversation Evidence</span>
                  <p className="text-[11px] text-slate-400">
                    Inspect relevant messages in audited privacy-controlled mode.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => inspectMessages(selectedReport)}
                  className="h-8 text-xs border-white/10 text-slate-200 hover:bg-white/5 gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                  Inspect Messages
                </Button>
              </div>

              {/* Moderation Action on User */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Enforce Moderation Action (Optional)
                </Label>
                <Select value={actionChoice} onValueChange={(val: any) => setActionChoice(val)}>
                  <SelectTrigger className="bg-slate-900 border-white/10 text-xs">
                    <SelectValue placeholder="Take no moderation action" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-xs">
                    <SelectItem value="none">No Moderation Action (Dismiss / Keep Status)</SelectItem>
                    <SelectItem value="warning">Issue Official Warning</SelectItem>
                    <SelectItem value="suspend">Temporarily Suspend Account (7 Days)</SelectItem>
                    <SelectItem value="ban">Permanently Ban User Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Internal Administrative Notes
                </Label>
                <Textarea
                  placeholder="Record justification and findings for this report resolution..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="bg-slate-900 border-white/10 text-xs resize-none"
                />
              </div>

              {/* Action Buttons */}
              <DialogFooter className="pt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveReport('dismissed')}
                  disabled={isSubmittingResolution}
                  className="border-white/10 text-xs text-slate-300 hover:bg-white/5"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Dismiss Report
                </Button>

                <Button
                  size="sm"
                  onClick={() => resolveReport('resolved')}
                  disabled={isSubmittingResolution}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark as Resolved
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PRIVACY-CONTROLLED MESSAGE INVESTIGATION MODAL */}
      <Dialog open={contextModalOpen} onOpenChange={setContextModalOpen}>
        <DialogContent className="max-w-lg bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-400 mb-1">
              <Shield className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">
                Audited Conversation Investigation
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              This message review is restricted to safety violations and logged in the immutable audit trail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {loadingMessages ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Fetching relevant conversation logs…
              </div>
            ) : investigatedMessages.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                No message records found for this user pair or message ID.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {investigatedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 rounded-xl border border-white/5 bg-slate-900/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Sender: {msg.sender_id?.substring(0, 8)}…</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-200">{msg.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setContextModalOpen(false)}
              className="border-white/10 text-xs text-slate-300"
            >
              Close Investigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
