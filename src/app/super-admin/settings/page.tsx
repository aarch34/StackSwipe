'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  Save,
  AlertTriangle,
  Sparkles,
  UserCheck,
  Bell,
  Lock,
  Layers,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function PlatformSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [maxDailyIcebreakers, setMaxDailyIcebreakers] = useState(15);
  const [defaultSuspensionDays, setDefaultSuspensionDays] = useState(7);
  const [communityGuidelines, setCommunityGuidelines] = useState('');
  const [systemAnnouncement, setSystemAnnouncement] = useState('');

  async function fetchSettings() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        const s = json.settings || {};
        setRegistrationEnabled(s.registration_enabled ?? true);
        setMaintenanceMode(s.maintenance_mode ?? false);
        setAiEnabled(s.ai_icebreakers_enabled ?? true);
        setMaxDailyIcebreakers(s.max_daily_icebreakers ?? 15);
        setDefaultSuspensionDays(s.default_suspension_days ?? 7);
        setCommunityGuidelines(s.community_guidelines ?? '');
        setSystemAnnouncement(s.system_announcement ?? '');
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Error loading settings', description: err.error || 'Failed to fetch platform settings', variant: 'destructive' });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registration_enabled: registrationEnabled,
          maintenance_mode: maintenanceMode,
          ai_icebreakers_enabled: aiEnabled,
          max_daily_icebreakers: maxDailyIcebreakers,
          default_suspension_days: defaultSuspensionDays,
          community_guidelines: communityGuidelines,
          system_announcement: systemAnnouncement,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update settings');
      }

      toast({
        title: 'Settings Persisted',
        description: 'Platform configurations updated and recorded in audit log.',
      });

      fetchSettings();
    } catch (err: any) {
      toast({
        title: 'Update Error',
        description: err.message || 'Could not save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Platform Master Settings
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs">
              Super Admin Privilege
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Global governance switches, community policies, and system announcements.
          </p>
        </div>

        <Button
          onClick={handleSaveSettings}
          disabled={saving || loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 shadow-md self-start sm:self-auto"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Availability & Emergency Toggles */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              Access & Maintenance Controls
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              High-level switches for platform availability and emergency maintenance.
            </CardDescription>
          </CardHeader>

          {/* Registration toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-950/60">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-white">New User Registrations</Label>
              <p className="text-[11px] text-slate-400">
                Allow new developers to create accounts and join StackSwipe.
              </p>
            </div>
            <Switch checked={registrationEnabled} onCheckedChange={setRegistrationEnabled} />
          </div>

          {/* Maintenance Mode toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-950/60">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-semibold text-white">Maintenance Mode</Label>
                {maintenanceMode && (
                  <Badge className="bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-mono">
                    ACTIVE
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Locks down ordinary user access for database upgrades and deployments.
              </p>
            </div>
            <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
          </div>

          {/* Default Suspension Duration */}
          <div className="p-3.5 rounded-xl border border-white/5 bg-slate-950/60 space-y-1.5">
            <Label className="text-xs font-semibold text-white">Default Suspension Duration (Days)</Label>
            <p className="text-[11px] text-slate-400">
              Standard cooldown period applied during temporary account suspensions.
            </p>
            <Input
              type="number"
              min={1}
              max={365}
              value={defaultSuspensionDays}
              onChange={(e) => setDefaultSuspensionDays(parseInt(e.target.value, 10) || 7)}
              className="bg-slate-900 border-white/10 text-xs w-32 font-mono text-white mt-1"
            />
          </div>
        </Card>

        {/* AI & Feature Boundaries */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-4">
          <CardHeader className="p-0 pb-2">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              AI & Engagement Boundaries
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Govern AI icebreaker availability and rate limits.
            </CardDescription>
          </CardHeader>

          {/* AI Icebreaker Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-slate-950/60">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-white">AI Icebreakers Availability</Label>
              <p className="text-[11px] text-slate-400">
                Enable or pause AI conversation generation suggestions.
              </p>
            </div>
            <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
          </div>

          {/* Max Daily Icebreakers */}
          <div className="p-3.5 rounded-xl border border-white/5 bg-slate-950/60 space-y-1.5">
            <Label className="text-xs font-semibold text-white">Max Daily AI Starters Per User</Label>
            <p className="text-[11px] text-slate-400">
              Quota limit to prevent Groq API abuse and token exhaustion.
            </p>
            <Input
              type="number"
              min={1}
              max={100}
              value={maxDailyIcebreakers}
              onChange={(e) => setMaxDailyIcebreakers(parseInt(e.target.value, 10) || 15)}
              className="bg-slate-900 border-white/10 text-xs w-32 font-mono text-white mt-1"
            />
          </div>
        </Card>

        {/* Platform Announcement Banner */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-3 lg:col-span-2">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-sky-400" />
              Platform-Wide Announcement Banner
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Broadcast critical notices, scheduled maintenance alerts, or release notes to all developers. Leave blank to hide.
            </CardDescription>
          </CardHeader>

          <Input
            placeholder="e.g. Scheduled maintenance on Sunday at 02:00 UTC. Discoveries will be paused briefly."
            value={systemAnnouncement}
            onChange={(e) => setSystemAnnouncement(e.target.value)}
            className="bg-slate-950/60 border-white/10 text-xs text-slate-100"
          />
        </Card>

        {/* Community Guidelines */}
        <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-5 space-y-3 lg:col-span-2">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              Community Guidelines & Code of Conduct
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              The official developer safety policy presented to users during onboarding and report filing.
            </CardDescription>
          </CardHeader>

          <Textarea
            rows={4}
            value={communityGuidelines}
            onChange={(e) => setCommunityGuidelines(e.target.value)}
            className="bg-slate-950/60 border-white/10 text-xs text-slate-100 resize-none font-mono"
          />
        </Card>
      </div>
    </div>
  );
}
