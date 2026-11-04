'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Power,
  TrendingUp,
  RefreshCw,
  Cpu,
} from '@/components/px-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function AiIcebreakersManagementPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Editable settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [maxDaily, setMaxDaily] = useState(15);

  async function loadAiData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/ai-icebreakers', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
        setAiEnabled(json.settings?.ai_icebreakers_enabled ?? true);
        setMaxDaily(json.settings?.max_daily_icebreakers ?? 15);
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading AI data', description: err.error || 'Failed to fetch AI icebreaker settings', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error loading AI data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAiData();
  }, []);

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/ai-icebreakers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: aiEnabled,
          maxDailyLimit: maxDaily,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }

      toast({
        title: 'Settings Saved',
        description: 'AI Icebreaker configuration updated successfully.',
      });

      loadAiData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not save settings',
        variant: 'destructive',
      });
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            AI Icebreaker Management
            <Badge
              className={`font-mono text-xs border ${
                aiEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
              }`}
            >
              {aiEnabled ? 'Service Active' : 'Service Paused'}
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor generation volume, configure daily user limits, and manage master availability.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Icebreakers</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.stats?.totalGenerated?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-amber-400 font-mono mt-0.5">Sparks Generated</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Daily AI Usage</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.stats?.dailyUsage?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">Today&apos;s requests</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Monthly AI Usage</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.stats?.monthlyUsage?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-sky-400 font-mono mt-0.5">30-day volume</p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Estimated AI Cost</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            ${loading ? '…' : data?.stats?.estimatedCostUSD ?? '0.00'}
          </p>
          <p className="text-[11px] text-slate-400 font-mono mt-0.5">Groq Cloud Tier</p>
        </Card>
      </div>

      {/* MASTER CONTROLS & SETTINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Master Settings */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-5">
            <CardHeader className="p-0">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-emerald-400" />
                Master Configuration
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Control the availability and generation boundaries for all users.
              </CardDescription>
            </CardHeader>

            {/* Kill switch */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-950/60">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold text-white">AI Icebreaker Service</Label>
                <p className="text-[11px] text-slate-400">
                  Instantly enable or pause AI conversation generation across the entire app.
                </p>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>

            {/* Daily limit */}
            <div className="space-y-2 p-3.5 rounded-xl border border-white/5 bg-slate-950/60">
              <Label htmlFor="daily-limit" className="text-xs font-semibold text-white">
                Max Daily Generations Per User
              </Label>
              <p className="text-[11px] text-slate-400">
                Prevents spam and API credit exhaustion by capping generations per developer per day.
              </p>
              <Input
                id="daily-limit"
                type="number"
                min={1}
                max={100}
                value={maxDaily}
                onChange={(e) => setMaxDaily(parseInt(e.target.value, 10) || 1)}
                className="bg-slate-900 border-white/10 text-xs w-32 font-mono text-white"
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {savingSettings ? 'Saving Settings…' : 'Save AI Configuration'}
            </Button>
          </Card>
        </div>

        {/* Right Column: Category Breakdown & Errors */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-4">
            <CardHeader className="p-0">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                Category Usage Breakdown
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Distribution of icebreaker conversation starter styles requested by users.
              </CardDescription>
            </CardHeader>

            <div className="space-y-2.5 pt-1">
              {Object.entries(data?.stats?.categoryBreakdown || {}).map(([cat, count]: any) => (
                <div
                  key={cat}
                  className="p-3 rounded-xl border border-white/5 bg-slate-950/60 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-200 capitalize">
                    {cat.replace('_', ' ')}
                  </span>
                  <Badge variant="outline" className="font-mono text-xs border-white/10 text-amber-400">
                    {count} generations
                  </Badge>
                </div>
              ))}
            </div>

            {/* Error logs */}
            <div className="pt-3 border-t border-white/10">
              <h4 className="text-xs font-mono uppercase text-slate-400 font-semibold mb-2">
                Recent API Errors ({data?.recentErrors?.length ?? 0})
              </h4>
              {data?.recentErrors?.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No recent AI provider errors detected.</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {data?.recentErrors?.map((err: any) => (
                    <div
                      key={err.id}
                      className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-300"
                    >
                      <span className="font-mono font-bold">
                        {new Date(err.created_at).toLocaleTimeString()}:
                      </span>{' '}
                      {err.error_message || 'Inference error'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
