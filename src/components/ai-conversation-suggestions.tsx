'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, X, Zap } from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UserProfile } from '@/lib/data';

interface AiSuggestionsProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  onSelectSuggestion: (suggestion: string) => void;
  className?: string;
}

export function AiConversationSuggestions({
  currentUser,
  otherUser,
  onSelectSuggestion,
  className,
}: AiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateSuggestions = async () => {
    if (showSuggestions && suggestions.length > 0) {
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/conversation-starters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUser,
          otherUser,
          conversationType: 'first_message',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');

      const data = await response.json();
      setSuggestions(data.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback personalized suggestions
      setSuggestions([
        `Hey ${otherUser.name}! Saw your focus on ${otherUser.techStack?.[0] || 'tech'} and ${otherUser.jobTitle || 'software engineering'}—would love to connect and swap ideas!`,
        `Hi ${otherUser.name}, loved your background${otherUser.company ? ` at ${otherUser.company}` : ''}! What's your favorite project you're building right now?`,
        `Hey ${otherUser.name}! Great to match on StackSwipe. What tech stack are you most excited about this year?`,
      ]);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setShowSuggestions(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={generateSuggestions}
        disabled={loading}
        className={cn(
          'w-full h-8 border-2 bg-secondary text-secondary-foreground text-sm py-1',
          'hover:bg-accent hover:text-accent-foreground',
          showSuggestions && 'bg-accent text-accent-foreground'
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Zap className="h-4 w-4 mr-2 text-amber-400 animate-pulse fill-amber-400" />
        )}
        <span className="font-semibold">
          {loading ? 'Igniting Sparks…' : '⚡ Stack Sparks'}
        </span>
        <span className="ml-2 text-[11px] font-normal hidden sm:inline">
          (Personalized AI Icebreakers)
        </span>
      </Button>

      {showSuggestions && (
        <Card className="bg-card text-card-foreground animate-in slide-in-from-bottom-2 duration-200">
          <CardHeader className="p-3.5 pb-2 border-b-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-label text-xs flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                Stack Sparks for {otherUser.name.split(' ')[0]}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={generateSuggestions}
                  disabled={loading}
                  title="Generate new sparks"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowSuggestions(false)}
                  title="Close sparks"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="group relative border-2 bg-background p-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer flex flex-col gap-1.5"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <p className="leading-relaxed text-xs sm:text-sm">
                  &ldquo;{suggestion}&rdquo;
                </p>
                <span className="self-end text-[10px] font-semibold flex items-center gap-1">
                  ⚡ Click to use spark →
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
