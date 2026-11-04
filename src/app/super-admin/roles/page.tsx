'use client';

import React, { useState, useEffect } from 'react';
import {
  UserCog,
  Shield,
  Plus,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Mail,
  User,
  MoreVertical,
  ShieldAlert,
} from '@/components/px-icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AdminRole } from '@/lib/admin-auth';

export default function AdminRolesPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Admin Dialog
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AdminRole>('moderator');
  const [saving, setSaving] = useState(false);

  async function fetchAdmins() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setAdmins(json.admins || []);
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function handleAssignAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to assign role');
      }

      toast({
        title: 'Role Assigned',
        description: `Successfully appointed ${email} as ${role}.`,
      });

      setInviteModalOpen(false);
      setEmail('');
      setName('');
      fetchAdmins();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not appoint admin',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(adminId: string, isActive: boolean) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/roles', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adminId, isActive }),
      });

      if (res.ok) {
        toast({ title: 'Status Updated' });
        fetchAdmins();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Admin Roles & Staff RBAC
            <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-xs">
              Super Admin Only
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage administrative personnel, assign granular permission tiers, and audit staff privileges.
          </p>
        </div>

        <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-md">
              <Plus className="h-4 w-4" />
              Add Admin Staff
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-md bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                Appoint Administrative Staff
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Grant role-based administrative authority. Action will be logged to audit trail.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAssignAdmin} className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Staff Email</Label>
                <Input
                  type="email"
                  required
                  placeholder="moderator@stackswipe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900 border-white/10 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Full Name</Label>
                <Input
                  placeholder="Jane Developer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-slate-900 border-white/10 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Administrative Role</Label>
                <Select value={role} onValueChange={(val: any) => setRole(val)}>
                  <SelectTrigger className="bg-slate-900 border-white/10 text-xs">
                    <SelectValue placeholder="Select role tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-xs">
                    <SelectItem value="super_admin">Super Admin (Unrestricted Root Access)</SelectItem>
                    <SelectItem value="moderator">Moderator (Reports, Warnings, Bans)</SelectItem>
                    <SelectItem value="support_admin">Support Admin (User Management & Accounts)</SelectItem>
                    <SelectItem value="analyst">Analyst (Read-Only Analytics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInviteModalOpen(false)}
                  className="border-white/10 text-xs text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {saving ? 'Appointing…' : 'Appoint Staff'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Definitions Reference Card */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
            Super Admin
          </Badge>
          <p className="text-xs text-slate-300 mt-2 font-medium">Full System Ownership</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Platform settings, roles, audit trails, and overrides.</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
          <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-mono">
            Moderator
          </Badge>
          <p className="text-xs text-slate-300 mt-2 font-medium">Safety & Enforcement</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Manage user reports, suspensions, warnings, and bans.</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-sky-500/20 bg-sky-500/5">
          <Badge className="bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-mono">
            Support Admin
          </Badge>
          <p className="text-xs text-slate-300 mt-2 font-medium">Account Services</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Inspect user records, verify accounts, and assist developers.</p>
        </div>

        <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-500/5">
          <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30 text-[10px] font-mono">
            Analyst
          </Badge>
          <p className="text-xs text-slate-300 mt-2 font-medium">Business Intelligence</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Read-only platform analytics, swipes/matches, and metrics.</p>
        </div>
      </div>

      {/* Admins Table */}
      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-950/60">
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-slate-400 py-3.5">Staff Name</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Email Address</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Role Clearance</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-400 text-right pr-4">Access Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    Loading admin users…
                  </TableCell>
                </TableRow>
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                    No admin accounts registered yet.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((a) => (
                  <TableRow
                    key={a.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <TableCell className="py-3 font-semibold text-xs text-white">
                      {a.name || 'Admin Staff'}
                    </TableCell>

                    <TableCell className="font-mono text-xs text-slate-300">{a.email}</TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs font-mono uppercase border border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                      >
                        {a.role?.replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                          a.is_active ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            a.is_active ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                        {a.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </TableCell>

                    <TableCell className="text-right pr-4">
                      {a.role !== 'super_admin' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleUpdateStatus(a.id, !a.is_active)}
                          className={`h-7 text-xs ${
                            a.is_active ? 'text-red-400 hover:bg-red-500/10' : 'text-emerald-400'
                          }`}
                        >
                          {a.is_active ? 'Revoke Access' : 'Reactivate'}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Protected</span>
                      )}
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
