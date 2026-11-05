'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

interface SafetyActionProps {
  user: { id: string; name: string };
  onDone?: () => void;
}

function ConfirmAction({
  user,
  onDone,
  rpc,
  label,
  title,
  description,
  doneMessage,
}: SafetyActionProps & {
  rpc: 'block_user' | 'unmatch_user';
  label: string;
  title: string;
  description: string;
  doneMessage: string;
}) {
  const { toast } = useToast();
  const { refreshMatches } = useAuth();
  const [working, setWorking] = useState(false);

  const confirm = async () => {
    setWorking(true);
    const { error } = await supabase.rpc(rpc, { p_user: user.id });
    setWorking(false);

    if (error) {
      console.error(`${rpc} failed:`, error);
      toast({ title: 'That did not work', description: 'Please try again in a moment.', variant: 'destructive' });
      return;
    }

    toast({ title: doneMessage });
    await refreshMatches();
    onDone?.();
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={confirm} disabled={working}>
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BlockUserAction({ user, onDone }: SafetyActionProps) {
  return (
    <ConfirmAction
      user={user}
      onDone={onDone}
      rpc="block_user"
      label="Block"
      title={`Block ${user.name}?`}
      description="You will not see each other in Discover and any chat between you will close for both of you. They are not told. If you need to, you can still report them, and our moderators can review past messages for a report."
      doneMessage={`${user.name} is blocked`}
    />
  );
}

export function UnmatchUserAction({ user, onDone }: SafetyActionProps) {
  return (
    <ConfirmAction
      user={user}
      onDone={onDone}
      rpc="unmatch_user"
      label="Unmatch"
      title={`Unmatch ${user.name}?`}
      description="This chat will close for both of you. You will not owe anyone an explanation. Our moderators can still review past messages if there is a report."
      doneMessage={`You unmatched ${user.name}`}
    />
  );
}

/** The blocked people list on the profile page, with a way to undo a block. */
export function BlockedPeopleList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const { data: blocks } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', user.id);
      const ids = (blocks ?? []).map((block) => block.blocked_id);
      if (!ids.length) {
        if (!cancelled) setPeople([]);
        return;
      }
      const { data: profiles } = await supabase.from('user_profiles').select('id, name').in('id', ids);
      if (!cancelled) setPeople((profiles ?? []).map((p) => ({ id: p.id, name: p.name || 'Unnamed member' })));
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const unblock = async (person: { id: string; name: string }) => {
    const { error } = await supabase.rpc('unblock_user', { p_user: person.id });
    if (error) {
      toast({ title: 'That did not work', description: 'Please try again in a moment.', variant: 'destructive' });
      return;
    }
    setPeople((current) => current.filter((p) => p.id !== person.id));
    toast({ title: `${person.name} is unblocked` });
  };

  if (!people.length) return null;

  return (
    <section className="space-y-2 border-t-2 pt-5">
      <h2 className="font-label text-xs">People you blocked</h2>
      <ul className="space-y-2">
        {people.map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-3 border-2 bg-background px-3 py-2 text-sm">
            <span className="truncate font-medium">{person.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => unblock(person)}>
              Unblock
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
