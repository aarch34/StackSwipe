'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Lock,
  Shield,
  Search,
  Eye,
  AlertTriangle,
  Clock,
  Send,
  CheckCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function MessagingAnalyticsPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Investigation input
  const [reportIdInput, setReportIdInput] = useState('');
  const [investigationReason, setInvestigationReason] = useState('');
  const [investigating, setInvestigating] = useState(false);
  const [investigatedMessages, setInvestigatedMessages] = useState<any[]>([]);
  const [inspectionActive, setInspectionActive] = useState(false);

  async function loadMessagingMetrics() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/messages', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setMetrics(json.metrics);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading metrics', description: err.error || 'Failed to fetch messaging data', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching messaging metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessagingMetrics();
  }, []);

  async function handleStartInvestigation(e: React.FormEvent) {
    e.preventDefault();
    if (!reportIdInput.trim() || !investigationReason.trim()) {
      toast({
        title: 'Missing Parameters',
        description: 'Both Report ID and documented investigation reason are mandatory.',
        variant: 'destructive',
      });
      return;
    }

    setInvestigating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(
        `/api/admin/messages?reportId=${encodeURIComponent(reportIdInput.trim())}&reason=${encodeURIComponent(investigationReason.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to inspect messages');
      }

      const json = await res.json();
      setInvestigatedMessages(json.investigatedMessages || []);
      setInspectionActive(true);
      toast({
        title: 'Investigation Access Granted',
        description: 'Context accessed and logged in the immutable audit trail.',
      });
    } catch (err: any) {
      toast({
        title: 'Access Denied',
        description: err.message || 'Could not access message context.',
        variant: 'destructive',
      });
    } finally {
      setInvestigating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Messaging Analytics & Safety
            <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono text-xs">
              Privacy Protected
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time chat activity velocity with privacy-controlled incident inspection.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Messages Sent</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : metrics?.totalMessages?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-purple-400 font-mono mt-0.5">Platform Lifetime</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Messages Sent Today</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : metrics?.messagesSentToday?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Today&apos;s activity</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Messages This Week</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : metrics?.messagesSentThisWeek?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-sky-400 font-mono mt-0.5">7-Day Volume</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Active Conversations</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : metrics?.activeConversations ?? 0}
          </p>
          <p className="text-[11px] text-indigo-400 font-mono mt-0.5">Distinct developer pairs</p>
        </Card>
      </div>

      {/* PRIVACY POLICY & SAFETY AUDIT SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Privacy Architecture Notice */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Privacy-First Architecture</h3>
                <p className="text-[11px] text-slate-400">Section 8 Compliance Guarantee</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with security and privacy requirements, administrators do not have blanket access to browse users&apos; private chats.
            </p>

            <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3 space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Message review is only permitted during active safety investigations.</span>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                <span>Every access attempt requires a linked Report ID and is permanently logged in the audit trail.</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Authorized Incident Inspection Form */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-400" />
                Authorized Safety Incident Inspection
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Enter an active safety Report ID and justification to inspect reported messages.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleStartInvestigation} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="report-id" className="text-xs font-semibold text-slate-300">
                  Target Report ID <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="report-id"
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  value={reportIdInput}
                  onChange={(e) => setReportIdInput(e.target.value)}
                  className="bg-slate-950/60 border-white/10 text-xs font-mono text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason" className="text-xs font-semibold text-slate-300">
                  Documented Investigation Reason <span className="text-red-400">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Detail the safety justification for reviewing this conversation evidence..."
                  value={investigationReason}
                  onChange={(e) => setInvestigationReason(e.target.value)}
                  rows={2}
                  className="bg-slate-950/60 border-white/10 text-xs resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={investigating}
                className="w-full bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-semibold transition-all gap-2"
              >
                {investigating ? 'Authorizing & Fetching…' : 'Inspect Reported Messages (Audited)'}
              </Button>
            </form>

            {/* Results Display */}
            {inspectionActive && (
              <div className="mt-6 pt-5 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase font-mono">
                    Retrieved Message Evidence ({investigatedMessages.length})
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                    Logged in Audit Trail
                  </Badge>
                </div>

                {investigatedMessages.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-3 text-center">
                    No relevant messages found for this report ID.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {investigatedMessages.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl border border-white/5 bg-slate-950/80 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>User ID: {m.sender_id?.substring(0, 8)}…</span>
                          <span>{new Date(m.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-200">{m.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
