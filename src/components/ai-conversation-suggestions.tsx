'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, X, Zap } from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAuthHeaders } from '@/lib/supabase';
import { ICEBREAKER_CATEGORIES, type IcebreakerCategoryId } from '@/lib/guidance';
import type { UserProfile } from '@/lib/data';

interface AiSuggestionsProps {
  otherUser: UserProfile;
  onSelectSuggestion: (suggestion: string) => void;
  className?: string;
}

export function AiConversationSuggestions({ otherUser, onSelectSuggestion, className }: AiSuggestionsProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<IcebreakerCategoryId | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (categoryId: IcebreakerCategoryId, avoid: string[] = []) => {
    setCategory(categoryId);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/conversation-starters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ otherUserId: otherUser.id, category: categoryId, avoid }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setSuggestions([]);
        setError(data.error || 'Could not come up with ideas just now. Please try again.');
        return;
      }

      setSuggestions(data.suggestions || []);
      setSeen([...avoid, ...(data.suggestions || [])].slice(-6));
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setSuggestions([]);
      setError('Could not reach the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'h-8 w-full border-2 bg-secondary py-1 text-sm text-secondary-foreground hover:bg-accent hover:text-accent-foreground',
          open && 'bg-accent text-accent-foreground'
        )}
      >
        <Zap className="mr-2 h-4 w-4" />
        <span className="font-semibold">Not sure what to say? We&apos;ve got a few ideas.</span>
      </Button>

      {open && (
        <div className="animate-in slide-in-from-bottom-2 max-h-[45vh] space-y-3 overflow-y-auto border-2 bg-card p-3 text-card-foreground duration-200">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 font-label text-xs">
              <Sparkles className="h-3.5 w-3.5" />
              What would you like to talk about?
            </h3>
            <div className="flex items-center gap-1">
              {category && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={loading}
                  aria-label="Try different ideas"
                  title="Try different ideas"
                  onClick={() => generate(category, seen)}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Close ideas"
                title="Close ideas"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ICEBREAKER_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                aria-pressed={category === item.id}
                onClick={() => {
                  setSeen([]);
                  generate(item.id);
                }}
                className={cn(
                  'border-2 px-2 py-1 text-xs font-medium transition-colors disabled:opacity-60',
                  category === item.id ? 'bg-accent text-accent-foreground' : 'bg-background hover:bg-muted'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking of a few ideas…
            </p>
          )}

          {error && !loading && <p className="text-xs font-medium text-destructive">{error}</p>}

          {!loading && suggestions.length > 0 && (
            <>
              <ul className="space-y-2">
                {suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectSuggestion(suggestion);
                        setOpen(false);
                      }}
                      className="w-full border-2 bg-background p-2.5 text-left text-sm leading-relaxed transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                Picking one puts it in your message box, so you can make it sound like you. Nothing is sent until you press send.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
