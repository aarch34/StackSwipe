'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag, ShieldAlert, CheckCircle2, AlertCircle } from '@/components/px-icons';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/supabase';

interface ReportUserDialogProps {
  reportedUser: {
    id: string;
    name: string;
  };
  relevantMessageIds?: string[];
  trigger?: React.ReactNode;
}

export function ReportUserDialog({
  reportedUser,
  relevantMessageIds = [],
  trigger,
}: ReportUserDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>('inappropriate_behaviour');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to submit a report.',
        variant: 'destructive',
      });
      return;
    }

    if (user.id === reportedUser.id) {
      toast({
        title: 'Invalid action',
        description: 'You cannot report your own profile.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({
          reportedId: reportedUser.id,
          category,
          description: description.trim(),
          relevantMessageIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmitted(true);
      toast({
        title: 'Report Submitted',
        description: 'Our safety and moderation team will review this report promptly.',
      });

      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setDescription('');
      }, 2000);
    } catch (err: any) {
      toast({
        title: 'Submission Error',
        description: err.message || 'Could not submit report.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 gap-1.5 transition-colors"
          >
            <Flag className="w-3.5 h-3.5 text-red-400" />
            Report
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md border border-white/10 bg-slate-950 text-slate-100 shadow-2xl rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold">
              Report {reportedUser.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            StackSwipe is committed to a safe, developer-friendly community. Reports are reviewed by our moderation team within 24 hours.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
            <h3 className="font-semibold text-white">Thank you for reporting</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Your report has been submitted to the safety team. Action will be taken in accordance with our community guidelines.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-xs font-semibold text-slate-300">
                Reason for report <span className="text-red-400">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="bg-slate-900 border-white/10 text-xs">
                  <SelectValue placeholder="Select violation category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-xs">
                  <SelectItem value="harassment">Harassment or Bullying</SelectItem>
                  <SelectItem value="inappropriate_behaviour">Inappropriate Behaviour</SelectItem>
                  <SelectItem value="spam">Spam or Self-promotion</SelectItem>
                  <SelectItem value="scamming">Scamming or Fraud</SelectItem>
                  <SelectItem value="fake_profile">Fake Profile or Impersonation</SelectItem>
                  <SelectItem value="suspicious_account">Suspicious Account Activity</SelectItem>
                  <SelectItem value="unwanted_messages">Unwanted or Explicit Messages</SelectItem>
                  <SelectItem value="other">Other Violation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold text-slate-300">
                Additional Details (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Provide any relevant context to assist our moderation investigation..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="bg-slate-900 border-white/10 text-xs resize-none placeholder:text-slate-500"
              />
            </div>

            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2.5 flex items-start gap-2 text-[11px] text-yellow-300/90">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>
                False or abusive reporting violates StackSwipe Terms of Service. Please only report genuine violations.
              </span>
            </div>

            <DialogFooter className="flex gap-2 sm:justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="border-white/10 text-slate-300 hover:bg-slate-900 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
