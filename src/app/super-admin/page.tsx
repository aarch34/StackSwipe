'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldAlert,
  UserX,
  Flame,
  MessageSquare,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserMinus,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Calendar,
  Clock,
  RefreshCw,
  Shield,
} from '@/components/px-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminOverviewPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');
  const [refreshing, setRefreshing] = useState(false);

  async function loadDashboardData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const [overviewRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/analytics?range=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (overviewRes.ok) {
        const oData = await overviewRes.json();
        setStats(oData.stats);
      } else {
        const err = await overviewRes.json().catch(() => ({}));
        toast({ title: 'Error loading overview', description: err.error || 'Failed to fetch dashboard stats', variant: 'destructive' });
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        setAnalyticsData(aData.timeSeries || []);
      } else {
        const err = await analyticsRes.json().catch(() => ({}));
        toast({ title: 'Error loading analytics', description: err.error || 'Failed to fetch analytics data', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Mission Control
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
              Live Production
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time platform metrics, developer activity, and safety operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <div className="flex rounded-xl border border-white/10 bg-slate-900/80 p-1 text-xs">
            {(['today', '7d', '30d', '90d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  timeRange === r
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'today' ? 'Today' : r.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 w-9 border-white/10 bg-slate-900/80 text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS (12 Core Indicators) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* 1. Total Registered Users */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Registered</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.totalUsers?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-emerald-400 mt-0.5 flex items-center gap-1 font-mono">
              <TrendingUp className="h-3 w-3" />
              Active Dev Profiles
            </p>
          </div>
        </Card>

        {/* 2. Active Users */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Accounts</span>
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.activeUsers?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">In Good Standing</p>
          </div>
        </Card>

        {/* 3. New Today */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">New Today</span>
            <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.newUsersToday?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              This Week: {stats?.newUsersWeek ?? 0}
            </p>
          </div>
        </Card>

        {/* 4. New This Month */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">New This Month</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.newUsersMonth?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-indigo-400 mt-0.5 font-mono">30-day cohort</p>
          </div>
        </Card>

        {/* 5. Total Swipes */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Swipes</span>
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.totalSwipes?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              👉 {stats?.rightSwipes ?? 0} | 👈 {stats?.leftSwipes ?? 0}
            </p>
          </div>
        </Card>

        {/* 6. Total Matches */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Mutual Matches</span>
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.totalMatches?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-pink-400 mt-0.5 font-mono">
              {stats?.matchSuccessRate ?? 0}% Conversion
            </p>
          </div>
        </Card>

        {/* 7. Total Messages */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Messages Sent</span>
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.totalMessages?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-purple-400 mt-0.5 font-mono">
              Today: {stats?.messagesToday ?? 0}
            </p>
          </div>
        </Card>

        {/* 8. AI Icebreaker Generations */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">AI Icebreakers</span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-white">
              {loading ? '…' : stats?.aiIcebreakerUsage?.toLocaleString() ?? 0}
            </p>
            <p className="text-[11px] text-amber-400 mt-0.5 font-mono">Groq Llama-3 Powered</p>
          </div>
        </Card>

        {/* 9. Pending Reports */}
        <Link href="/super-admin/reports">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 hover:border-red-500/40 transition-all cursor-pointer">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Pending Reports</span>
              <div className="h-8 w-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                <ShieldAlert className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white">
                {loading ? '…' : stats?.pendingReports ?? 0}
              </p>
              <p className="text-[11px] text-red-400 mt-0.5 font-mono">Needs Safety Review</p>
            </div>
          </Card>
        </Link>

        {/* 10. Suspended Accounts */}
        <Link href="/super-admin/suspended">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 hover:border-amber-500/40 transition-all cursor-pointer">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Suspended</span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white">
                {loading ? '…' : stats?.suspendedAccounts ?? 0}
              </p>
              <p className="text-[11px] text-amber-400 mt-0.5 font-mono">Temporary Hold</p>
            </div>
          </Card>
        </Link>

        {/* 11. Permanently Banned */}
        <Link href="/super-admin/suspended">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 hover:border-red-500/40 transition-all cursor-pointer">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Banned Accounts</span>
              <div className="h-8 w-8 rounded-lg bg-red-500/20 text-red-500 flex items-center justify-center">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white">
                {loading ? '…' : stats?.bannedAccounts ?? 0}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 font-mono">Zero Tolerance</p>
            </div>
          </Card>
        </Link>

        {/* 12. Security Audit Trail Status */}
        <Link href="/super-admin/audit-logs">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 hover:border-emerald-500/40 transition-all cursor-pointer">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-medium">Audit Logs</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Shield className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-white">Secured</p>
              <p className="text-[11px] text-emerald-400 mt-0.5 font-mono">Immutable Trail</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* INTERACTIVE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations & Daily Active Users */}
        <Card className="border-white/10 bg-slate-900/70 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>User Registration & DAU Trends</span>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-slate-400">
                {timeRange.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              New accounts vs daily active platform sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData}>
                  <defs>
                    <linearGradient id="dauGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#ffffff15',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="dau"
                    name="Daily Active (DAU)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#dauGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="newUsers"
                    name="New Registrations"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#userGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Discovery & Messaging Velocity */}
        <Card className="border-white/10 bg-slate-900/70 backdrop-blur-md rounded-2xl overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>Swipes, Matches & Messages</span>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10 text-slate-400">
                Activity Velocity
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Interaction breakdown across the discovery funnel
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#ffffff15',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="swipes" name="Swipes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="matches" name="Matches" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="messages" name="Messages" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Dock */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-950 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-sm">Quick Safety & Operations Dock</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct shortcuts to active administrative queues and moderation tools.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/super-admin/reports">
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 shadow-md">
              <ShieldAlert className="h-3.5 w-3.5" />
              Review Reports ({stats?.pendingReports ?? 0})
            </Button>
          </Link>

          <Link href="/super-admin/users">
            <Button size="sm" variant="outline" className="border-white/10 text-slate-200 hover:bg-white/5 text-xs gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Manage Users
            </Button>
          </Link>

          <Link href="/super-admin/ai-icebreakers">
            <Button size="sm" variant="outline" className="border-white/10 text-slate-200 hover:bg-white/5 text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              AI Controls
            </Button>
          </Link>

          <Link href="/super-admin/settings">
            <Button size="sm" variant="outline" className="border-white/10 text-slate-200 hover:bg-white/5 text-xs gap-1.5">
              Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
