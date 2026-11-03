'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Search,
  Trash2,
  AlertTriangle,
  UserCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Shield,
  Bot,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function SwipesMatchesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userSearchId, setUserSearchId] = useState('');

  // Remove Match confirmation dialog
  const [matchToRemove, setMatchToRemove] = useState<any | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const queryParams = new URLSearchParams();
      if (userSearchId.trim()) {
        queryParams.set('userId', userSearchId.trim());
      }

      const res = await fetch(`/api/admin/swipes-matches?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching swipes/matches data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [userSearchId]);

  async function handleRemoveMatch() {
    if (!matchToRemove) return;
    if (!removalReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'You must provide a documented reason to remove a match.',
        variant: 'destructive',
      });
      return;
    }

    setIsRemoving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch('/api/admin/swipes-matches', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          matchId: matchToRemove.id,
          reason: removalReason.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove match');
      }

      toast({
        title: 'Match Removed',
        description: 'The mutual match connection was disconnected.',
      });

      setMatchToRemove(null);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Could not remove match',
        variant: 'destructive',
      });
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Swiping & Match Management
            <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 font-mono text-xs">
              Discovery Engine
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Analyze discovery volume, inspect mutual connections, and audit swipe velocity.
          </p>
        </div>
      </div>

      {/* Discovery Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Discovery Swipes</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.metrics?.totalSwipes?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
            Today: {data?.metrics?.dailySwipes ?? 0}
          </p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Right Swipes (Connect)</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.metrics?.rightSwipes?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
            Left: {data?.metrics?.leftSwipes ?? 0}
          </p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Mutual Matches</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.metrics?.totalMatches?.toLocaleString() ?? 0}
          </p>
          <p className="text-[11px] text-pink-400 font-mono mt-0.5">
            {data?.metrics?.matchSuccessRate ?? 0}% Success Rate
          </p>
        </Card>

        <Card className="border-white/10 bg-slate-900/60 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Avg Swipes / User</span>
          <p className="text-2xl font-extrabold text-white mt-2">
            {loading ? '…' : data?.metrics?.averageSwipesPerUser ?? 0}
          </p>
          <p className="text-[11px] text-indigo-400 font-mono mt-0.5">Engagement depth</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* RECENT MATCHES LIST & REMOVAL (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-white">Recent Match Connections</CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Pairs of developers who mutually swiped right on StackSwipe.
                  </CardDescription>
                </div>

                {/* Filter matches by user ID */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    placeholder="Filter by User ID..."
                    value={userSearchId}
                    onChange={(e) => setUserSearchId(e.target.value)}
                    className="pl-8 h-8 text-xs bg-slate-950/60 border-white/10 text-slate-200"
                  />
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/60">
                  <TableRow className="border-b border-white/10">
                    <TableHead className="text-xs text-slate-400 py-3">Participant 1</TableHead>
                    <TableHead className="text-xs text-slate-400 text-center">Connection</TableHead>
                    <TableHead className="text-xs text-slate-400">Participant 2</TableHead>
                    <TableHead className="text-xs text-slate-400">Matched On</TableHead>
                    <TableHead className="text-xs text-slate-400 text-right pr-4">Moderate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        Loading match records…
                      </TableCell>
                    </TableRow>
                  ) : !data?.recentMatches || data.recentMatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-xs text-slate-400">
                        No matches found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentMatches.map((m: any) => (
                      <TableRow key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        {/* User 1 */}
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border border-white/10 shrink-0">
                              <AvatarImage src={m.user1?.photo_url} alt={m.user1?.name} />
                              <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                                {m.user1?.name?.charAt(0) ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                              {m.user1?.name}
                            </span>
                          </div>
                        </TableCell>

                        {/* Connection indicator */}
                        <TableCell className="text-center">
                          <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                            <Flame className="h-3 w-3" />
                          </div>
                        </TableCell>

                        {/* User 2 */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 border border-white/10 shrink-0">
                              <AvatarImage src={m.user2?.photo_url} alt={m.user2?.name} />
                              <AvatarFallback className="bg-emerald-500/20 text-emerald-300 text-[10px]">
                                {m.user2?.name?.charAt(0) ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                              {m.user2?.name}
                            </span>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs text-slate-400 font-mono">
                          {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>

                        {/* Remove Match button */}
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setMatchToRemove(m);
                              setRemovalReason('');
                            }}
                            className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove
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

        {/* MOST ACTIVE SWIPERS / VELOCITY AUDIT (1/3 width) */}
        <div className="space-y-4">
          <Card className="border-white/10 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4">
            <CardHeader className="p-0 pb-3">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Bot className="h-4 w-4 text-amber-400" />
                Swipe Velocity Audit
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Accounts with highest swipe frequencies. High velocity accounts (&gt;150) are flagged for bot inspection.
              </CardDescription>
            </CardHeader>

            <div className="space-y-2.5 pt-2">
              {!data?.topActiveUsers || data.topActiveUsers.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No swipe frequency outliers detected.
                </p>
              ) : (
                data.topActiveUsers.map((u: any) => (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl border border-white/5 bg-slate-950/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Avatar className="h-8 w-8 border border-white/10 shrink-0">
                        <AvatarImage src={u.photoURL} alt={u.name} />
                        <AvatarFallback className="bg-slate-800 text-slate-300 text-xs font-bold">
                          {u.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-white truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{u.id.substring(0, 8)}…</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono border ${
                          u.suspicious
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {u.swipeCount} Swipes
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* CONFIRMATION DIALOG FOR REMOVING A MATCH */}
      <Dialog open={Boolean(matchToRemove)} onOpenChange={(open) => !open && setMatchToRemove(null)}>
        <DialogContent className="max-w-md bg-slate-950 border-white/10 text-slate-100 rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Disconnect Mutual Match</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-400">
              You are removing the mutual connection between{' '}
              <span className="font-semibold text-white">{matchToRemove?.user1?.name}</span> and{' '}
              <span className="font-semibold text-white">{matchToRemove?.user2?.name}</span>. A documented reason is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <Label className="text-xs font-semibold text-slate-300">
              Mandatory Moderation Reason <span className="text-red-400">*</span>
            </Label>
            <Textarea
              placeholder="Explain why this match connection is being removed (e.g. reported harassment, fake profile)..."
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              rows={3}
              className="bg-slate-900 border-white/10 text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMatchToRemove(null)}
              disabled={isRemoving}
              className="border-white/10 text-xs text-slate-300"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRemoveMatch}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              {isRemoving ? 'Disconnecting…' : 'Disconnect Match'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
