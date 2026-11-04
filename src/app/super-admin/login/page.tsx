'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Terminal } from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Check if already authenticated as admin
  useEffect(() => {
    async function checkCurrentAdmin() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const res = await fetch('/api/admin/auth/me', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (res.ok) {
            router.replace('/super-admin');
            return;
          }
        }
      } catch (err) {
        console.warn('Existing admin check error:', err);
      } finally {
        setCheckingExisting(false);
      }
    }
    checkCurrentAdmin();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Authenticate via Server Admin Route
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // 2. Set Supabase session in client
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // 3. Admin verified successfully!
      router.push('/super-admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Shield className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-xs font-mono">Verifying administrative security clearance…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden">

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="px-raised inline-flex items-center justify-center h-14 w-14 bg-primary text-primary-foreground mb-3">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="font-headline text-5xl font-bold leading-none text-white flex items-center justify-center gap-2">
            StackSwipe
            <span className="font-label text-xs px-2 py-0.5 bg-accent text-accent-foreground">
              Super Admin
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Restricted Mission Control & Security Dashboard
          </p>
        </div>

        <Card className="px-raised bg-card overflow-hidden">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="font-headline text-3xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Administrative Login
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Only authorized staff and security personnel may authenticate here.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 flex items-start gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="admin-email" className="text-xs font-semibold text-slate-300">
                  Staff Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@stackswipe.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-9 bg-slate-950/60 border-white/10 text-slate-100 placeholder:text-slate-600 text-xs focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-pass" className="text-xs font-semibold text-slate-300">
                  Master Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    id="admin-pass"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-9 bg-slate-950/60 border-white/10 text-slate-100 placeholder:text-slate-600 text-xs focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3 text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Server RBAC Gated
                </span>
                <span className="text-emerald-400 font-mono text-[10px]">TLS 1.3 / Supabase</span>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 gap-2"
              >
                {loading ? (
                  'Verifying Credentials…'
                ) : (
                  <>
                    Access Command Center
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Return to User Platform
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-[10px] text-slate-600 mt-6 font-mono">
          StackSwipe Security Architecture • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
