'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Shield,
  Search,
  Filter,
  Clock,
  Eye,
  Calendar,
  Lock,
  ChevronLeft,
  ChevronRight,
  Code,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Inspector Dialog for selected log payload
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  async function fetchLogs() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const queryParams = new URLSearchParams({
        action: actionFilter,
        targetType: targetFilter,
        page: page.toString(),
        limit: '15',
      });

      const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
        setTotalPages(json.totalPages || 1);
        setTotalCount(json.total || 0);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, targetFilter, page]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Immutable Audit Trail
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs">
              Cryptographically Guarded
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete tamper-proof record of every administrative action, user sanction, and settings change.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Lock className="h-4 w-4 text-emerald-400" />
          <span>Write-Only Log Policy</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Select
              value={targetFilter}
              onValueChange={(val) => {
                setTargetFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-950/60 border-white/10 text-xs text-slate-200 rounded-xl">
                <SelectValue placeholder="Target Category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-xs">
                <SelectItem value="all">All Targets</SelectItem>
                <SelectItem value="user">Users (Sanctions & Restores)</SelectItem>
                <SelectItem value="report">Reports (Resolutions)</SelectItem>
                <SelectItem value="match">Matches (Removals)</SelectItem>
                <SelectItem value="platform_settings">Platform Settings</SelectItem>
                <SelectItem value="admin_user">Staff Roles</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select
              value={actionFilter}
              onValueChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="bg-slate-950/60 border-white/10 text-xs text-slate-200 rounded-xl">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-xs">
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="USER_SUSPEND">USER_SUSPEND</SelectItem>
                <SelectItem value="USER_BAN">USER_BAN</SelectItem>
                <SelectItem value="USER_RESTORE">USER_RESTORE</SelectItem>
                <SelectItem value="USER_SOFT_DELETE">USER_SOFT_DELETE</SelectItem>
                <SelectItem value="REPORT_RESOLVED">REPORT_RESOLVED</SelectItem>
                <SelectItem value="REPORT_DISMISSED">REPORT_DISMISSED</SelectItem>
                <SelectItem value="MATCH_REMOVED">MATCH_REMOVED</SelectItem>
                <SelectItem value="PLATFORM_SETTINGS_UPDATED">PLATFORM_SETTINGS_UPDATED</SelectItem>
                <SelectItem value="ADMIN_ROLE_ASSIGNED">ADMIN_ROLE_ASSIGNED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-400 py-3.5">Action Executed</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Staff Member</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Target</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Reason</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-right pr-4">Payload</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    Loading audit trail…
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No audit records found matching your filter.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="py-3">
                      <Badge
                        variant="outline"
                        className="font-mono text-[10px] uppercase border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      >
                        {log.action}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="truncate max-w-[150px]">
                        <p className="text-xs font-semibold text-white truncate">{log.admin_email}</p>
                        <p className="text-[10px] text-slate-400 font-mono capitalize">
                          {log.admin_role?.replace('_', ' ')}
                        </p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="font-mono text-xs text-slate-300">
                        <span className="text-slate-500 capitalize">{log.target_type}: </span>
                        {log.target_id ? `${log.target_id.substring(0, 8)}…` : 'Global'}
                      </div>
                    </TableCell>

                    <TableCell className="max-w-xs truncate text-xs text-slate-300 italic">
                      &quot;{log.reason || 'No documented reason'}&quot;
                    </TableCell>

                    <TableCell className="text-xs text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/5 gap-1"
                      >
                        <Code className="h-3.5 w-3.5 text-emerald-400" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>
            Total: <span className="font-semibold text-white">{totalCount}</span> entries
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

      {/* JSON PAYLOAD INSPECTOR MODAL */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-xl bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono">
              <Code className="h-4 w-4 text-emerald-400" />
              Audit Entry: {selectedLog?.action}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-mono">
              ID: {selectedLog?.id} • Recorded at {selectedLog?.created_at}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div>
                  <span className="text-slate-500">Staff Email:</span>
                  <p className="font-mono text-slate-200">{selectedLog.admin_email}</p>
                </div>
                <div>
                  <span className="text-slate-500">Staff Role:</span>
                  <p className="font-mono text-emerald-400 uppercase">{selectedLog.admin_role}</p>
                </div>
                <div>
                  <span className="text-slate-500">Target Type:</span>
                  <p className="font-mono text-slate-200">{selectedLog.target_type}</p>
                </div>
                <div>
                  <span className="text-slate-500">Target ID:</span>
                  <p className="font-mono text-slate-200">{selectedLog.target_id || 'N/A'}</p>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-semibold">Documented Reason:</span>
                <p className="p-2.5 rounded-lg bg-slate-900 border border-white/5 text-slate-200 mt-1 italic">
                  &quot;{selectedLog.reason || 'None provided'}&quot;
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-semibold font-mono">State Diff Payload:</span>
                <pre className="p-3 rounded-xl bg-slate-900/90 border border-white/5 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48 mt-1">
                  {JSON.stringify(
                    {
                      previousState: selectedLog.previous_state,
                      newState: selectedLog.new_state,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedLog(null)}
              className="border-white/10 text-xs text-slate-300"
            >
              Close Inspector
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
