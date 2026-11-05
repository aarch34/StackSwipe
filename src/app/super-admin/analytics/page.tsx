'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Filter,
  Users,
  Flame,
  MessageSquare,
  ShieldAlert,
  ArrowUpRight,
  Activity,
  Layers,
} from '@/components/px-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

const percentOf = (part = 0, whole = 0) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function PlatformAnalyticsPage() {
  const { toast } = useToast();
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [mission, setMission] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      let url = `/api/admin/analytics?range=${range}`;
      if (range === 'custom' && customStart) {
        url += `&startDate=${encodeURIComponent(customStart)}`;
        if (customEnd) url += `&endDate=${encodeURIComponent(customEnd)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setTimeSeries(json.timeSeries || []);
        setSummary(json.summary || null);
        setMission(json.mission || null);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading analytics', description: err.error || 'Failed to fetch analytics data', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, [range]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Platform Analytics
            <Badge className="bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-xs">
              Time-Series Intelligence
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Cohort retention, discovery funnel velocity, and user growth curves.
          </p>
        </div>

        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-white/10 bg-slate-900/80 p-1 text-xs">
            {(['today', '7d', '30d', '90d', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  range === r
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'today' ? 'Today' : r === 'custom' ? 'Custom' : r.toUpperCase()}
              </button>
            ))}
          </div>

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 text-xs bg-slate-900 border-white/10 text-white w-36"
              />
              <span className="text-slate-500 text-xs">to</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 text-xs bg-slate-900 border-white/10 text-white w-36"
              />
              <Button
                size="sm"
                onClick={fetchAnalytics}
                className="h-8 text-xs bg-sky-600 hover:bg-sky-700 text-white"
              >
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cohort Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">New Registrations</span>
          <p className="text-2xl font-extrabold text-white mt-1.5">{summary?.totalNewUsers ?? 0}</p>
          <p className="text-[10px] text-sky-400 font-mono mt-0.5">Cohort additions</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Cohort Swipes</span>
          <p className="text-2xl font-extrabold text-white mt-1.5">{summary?.totalSwipes ?? 0}</p>
          <p className="text-[10px] text-amber-400 font-mono mt-0.5">Discovery activity</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Cohort Matches</span>
          <p className="text-2xl font-extrabold text-white mt-1.5">{summary?.totalMatches ?? 0}</p>
          <p className="text-[10px] text-pink-400 font-mono mt-0.5">Connections formed</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Cohort Messages</span>
          <p className="text-2xl font-extrabold text-white mt-1.5">{summary?.totalMessages ?? 0}</p>
          <p className="text-[10px] text-purple-400 font-mono mt-0.5">Messages exchanged</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-400 font-medium">Active Retention</span>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1.5">
            {summary?.retentionRate ?? 0}%
          </p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">7-Day Engagement</p>
        </Card>
      </div>

      {/* MISSION METRICS */}
      {mission && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-white">Mission metrics</h2>
            <p className="text-xs text-slate-400">
              All-time totals only. Are people finding guidance, sharing knowledge and having real conversations?
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {[
              { label: 'Registered users', value: mission.registeredUsers },
              { label: 'Completed profiles', value: mission.completedProfiles },
              { label: 'Willing to help', value: mission.willingToHelp },
              { label: 'Seeking guidance', value: mission.seekingGuidance },
              { label: 'Both learning and helping', value: mission.learningAndHelping },
              { label: 'Total swipes', value: mission.totalSwipes },
              { label: 'Successful matches', value: mission.totalMatches },
              { label: 'Conversations started', value: mission.conversationsStarted },
              {
                label: 'First-message rate',
                value: `${percentOf(mission.conversationsStarted, mission.totalMatches)}%`,
                hint: 'Matches with at least one message',
              },
              {
                label: 'Conversations with replies',
                value: mission.conversationsWithReplies,
                hint: `${percentOf(mission.conversationsWithReplies, mission.conversationsStarted)}% of those started`,
              },
              { label: 'Repeat conversations', value: mission.repeatConversations, hint: 'Replies, on 2 or more days' },
              { label: 'AI icebreaker uses', value: mission.icebreakerUses },
              {
                label: '7-day retention',
                value: `${percentOf(mission.retainedUsers, mission.eligibleForRetention)}%`,
                hint: 'Active a week or more after joining',
              },
              { label: 'Matched over shared learning', value: mission.sharedLearningMatches, hint: 'Same topic listed by both' },
              { label: 'Matched with someone who can help', value: mission.helpMatches, hint: 'Same topic listed by both' },
            ].map((metric) => (
              <Card key={metric.label} className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
                <span className="text-xs text-slate-400 font-medium">{metric.label}</span>
                <p className="text-2xl font-extrabold text-white mt-1.5">{metric.value ?? 0}</p>
                {metric.hint && <p className="text-[10px] text-slate-400 mt-0.5">{metric.hint}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: DAU / User Growth Trend */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>Daily Active Users (DAU) & Signups</span>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                Growth Curve
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Active sessions vs new account creation over selected period
            </CardDescription>
          </CardHeader>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="dauColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF7A9A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF7A9A" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" stroke="#BBA0A0" fontSize={11} />
                <YAxis stroke="#BBA0A0" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#321C27',
                    borderColor: '#ffffff15',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area
                  type="stepAfter"
                  dataKey="dau"
                  name="Active Devs (DAU)"
                  stroke="#FF7A9A"
                  strokeWidth={2}
                  fill="url(#dauColor)"
                />
                <Line
                  type="stepAfter"
                  dataKey="newUsers"
                  name="New Signups"
                  stroke="#2FB84A"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Swipes Direction (Right vs Left) */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>Swipe Decisions: Connect vs Skip</span>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                Intent Ratio
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Right swipes (interested) compared to left swipes (passed)
            </CardDescription>
          </CardHeader>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" stroke="#BBA0A0" fontSize={11} />
                <YAxis stroke="#BBA0A0" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#321C27',
                    borderColor: '#ffffff15',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar
                  dataKey="rightSwipes"
                  name="Right Swipes (Connect)"
                  fill="#2FB84A"
                  radius={0}
                />
                <Bar
                  dataKey="leftSwipes"
                  name="Left Swipes (Skip)"
                  fill="#BBA0A0"
                  radius={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 3: Messages Over Time */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>Messaging Conversation Volume</span>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                Retention Driver
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Daily frequency of messages exchanged between matched developers
            </CardDescription>
          </CardHeader>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" stroke="#BBA0A0" fontSize={11} />
                <YAxis stroke="#BBA0A0" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#321C27',
                    borderColor: '#ffffff15',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="stepAfter"
                  dataKey="messages"
                  name="Messages Sent"
                  stroke="#9C80DC"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 4: Safety & Report Trends */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>Safety & Incident Report Influx</span>
              <Badge variant="outline" className="text-[10px] font-mono border-white/10">
                Community Health
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Frequency of safety reports submitted by developers
            </CardDescription>
          </CardHeader>
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="label" stroke="#BBA0A0" fontSize={11} />
                <YAxis stroke="#BBA0A0" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#321C27',
                    borderColor: '#ffffff15',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Bar
                  dataKey="reports"
                  name="Safety Reports"
                  fill="#F2572B"
                  radius={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
