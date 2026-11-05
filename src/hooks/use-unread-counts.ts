'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';

const REFRESH_MS = 15000;

/** Unread messages per match. Row Level Security limits the query to the user's own chats. */
export function useUnreadCounts() {
  const { user } = useAuth();
  const userId = user?.id;
  const [counts, setCounts] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('messages')
      .select('match_id')
      .eq('read', false)
      .neq('sender_id', userId);

    if (error || !data) return;

    const next: Record<string, number> = {};
    data.forEach((row) => {
      next[row.match_id] = (next[row.match_id] || 0) + 1;
    });
    setCounts(next);
  }, [userId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { counts, refresh };
}
