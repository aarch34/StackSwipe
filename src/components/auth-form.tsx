'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, checkIsAdmin } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Icons } from '@/components/icons';
import { supabase } from '@/lib/supabase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  ArrowLeft,
} from '@/components/px-icons';

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
}

function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const msg = error.message || error.error_description || error.toString?.() || '';

  if (msg.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (msg.includes('User already registered')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (msg.includes('Password should be at least 6 characters')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment before trying again.';
  }

  return msg || 'Authentication failed. Please try again.';
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    login,
    signup,
    loginWithGoogle,
    loginWithGithub,
    user,
    session,
    hasProfile,
    profile,
    onboardingCompleted,
  } = useAuth();

  // Mode: 'login' | 'signup'
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Loading states
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | 'email' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // The address waiting on a confirmation email, when the project requires one
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');

  // If already authenticated, redirect to appropriate destination
  useEffect(() => {
    if (!user || !session) return;

    let cancelled = false;
    checkIsAdmin(session.access_token).then((isAdmin) => {
      if (cancelled) return;
      if (isAdmin) {
        router.replace('/super-admin');
        return;
      }
      const isCompleted = Boolean(
        profile?.onboarding_completed ||
        onboardingCompleted ||
        (typeof window !== 'undefined' && localStorage.getItem(`stackswipe_onboarding_${user.id}`)?.includes('"onboarding_completed":true'))
      );
      router.replace(isCompleted ? '/dashboard' : '/onboarding');
    });

    return () => {
      cancelled = true;
    };
  }, [user, session, profile, onboardingCompleted, router]);

  const handleOAuth = async (provider: 'google' | 'github') => {
    setErrorMessage(null);
    setLoadingProvider(provider);
    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithGithub();
      }
    } catch (err: any) {
      console.error(`${provider} OAuth error:`, err);
      setErrorMessage(formatAuthError(err));
      setLoadingProvider(null);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setLoadingProvider('email');
    try {
      if (mode === 'signup') {
        const data = await signup(email.trim(), password);

        if (data.session) {
          // Signed in straight away, so the effect above moves on to onboarding.
          toast({
            title: 'Account created',
            description: "Welcome to StackSwipe! Let's set up your profile.",
          });
        } else if (data.user?.identities?.length === 0) {
          // Supabase hides whether an address is taken by returning a user with no identities.
          setMode('login');
          setErrorMessage('An account with this email already exists. Please sign in instead.');
        } else {
          setResendState('idle');
          setAwaitingEmail(email.trim());
        }
      } else {
        await login(email, password);
        toast({
          title: 'Welcome Back!',
          description: 'Successfully logged in to StackSwipe.',
        });
      }
    } catch (err: any) {
      if (err?.message?.includes('Email not confirmed')) {
        setResendState('idle');
        setAwaitingEmail(email.trim());
        return;
      }
      console.error('Email authentication error:', err);
      setErrorMessage(formatAuthError(err));
    } finally {
      setLoadingProvider(null);
    }
  };

  const resendConfirmation = async () => {
    if (!awaitingEmail) return;
    setErrorMessage(null);
    setResendState('sending');

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: awaitingEmail,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });

    if (error) {
      setResendState('idle');
      setErrorMessage(formatAuthError(error));
    } else {
      setResendState('sent');
    }
  };

  if (awaitingEmail) {
    return (
      <div className="mx-auto w-full max-w-md">
        <Card className="px-raised bg-card">
          <CardHeader className="pb-4 text-center">
            <div className="mb-3 flex justify-center">
              <Mail className="h-10 w-10" />
            </div>
            <CardTitle className="font-headline text-4xl font-bold leading-none sm:text-5xl">
              Check your email
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-semibold text-foreground break-all">{awaitingEmail}</span>.
              Open it to confirm your account, and we&apos;ll take you straight to setting up your profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {errorMessage && (
              <Alert variant="destructive" className="py-2.5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs font-medium sm:text-sm">{errorMessage}</AlertDescription>
              </Alert>
            )}
            <p className="text-center text-xs text-muted-foreground" aria-live="polite">
              {resendState === 'sent' ? 'Sent again. It can take a minute to arrive.' : 'Not there? Check your spam folder.'}
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={resendState !== 'idle'}
              onClick={resendConfirmation}
            >
              {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Email sent' : 'Resend the email'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setAwaitingEmail(null);
                setErrorMessage(null);
                setMode('login');
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="px-raised bg-card">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <Icons.logo className="h-10 w-10" />
          </div>
          <CardTitle className="font-headline text-4xl font-bold leading-none sm:text-5xl">
            {mode === 'signup' ? 'Everyone starts somewhere' : 'Welcome back'}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground mt-1">
            {mode === 'signup'
              ? 'Join a community where every question is welcome'
              : 'Your people and conversations are waiting'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs sm:text-sm font-medium">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* OAUTH SECTION */}
          <div className="space-y-2.5">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 relative flex items-center justify-center gap-2"
              disabled={loadingProvider !== null}
              onClick={() => handleOAuth('google')}
            >
              {loadingProvider === 'google' ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Icons.google className="h-4 w-4 shrink-0" />
              )}
              <span>Continue with Google</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 relative flex items-center justify-center gap-2"
              disabled={loadingProvider !== null}
              onClick={() => handleOAuth('github')}
            >
              {loadingProvider === 'github' ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Icons.gitHub className="h-4 w-4 shrink-0" />
              )}
              <span>Continue with GitHub</span>
            </Button>
          </div>

          {/* DIVIDER */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-3 text-muted-foreground font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          {/* EMAIL FORM */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@company.com"
                  className="pl-9 h-10"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loadingProvider !== null}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                {mode === 'login' && (
                  <span className="text-[11px] text-muted-foreground">
                    Min. 6 characters
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9 h-10"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loadingProvider !== null}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-medium">
                  Confirm password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-9 h-10"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loadingProvider !== null}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-10 font-medium"
              disabled={loadingProvider !== null}
            >
              {loadingProvider === 'email' ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{mode === 'signup' ? 'Creating account...' : 'Signing in...'}</span>
                </div>
              ) : (
                <span>{mode === 'signup' ? 'Create Account' : 'Sign In with Email'}</span>
              )}
            </Button>
          </form>

          {/* TOGGLE LOGIN / SIGNUP */}
          <div className="text-center text-xs text-muted-foreground pt-1">
            {mode === 'signup' ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New to StackSwipe?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Create an account
                </button>
              </span>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col border-t-2 py-3 text-center text-[11px] text-muted-foreground">
          <p>
            By continuing, you agree to StackSwipe&apos;s{' '}
            <Link href="#" className="underline hover:text-foreground">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="underline hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-2">
            <Link href="/" className="text-primary hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to home
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
