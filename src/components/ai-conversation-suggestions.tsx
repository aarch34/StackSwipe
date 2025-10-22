'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  className 
}: AiSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/conversation-starters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUser,
          otherUser,
          conversationType: 'first_message'
        })
      });

      if (!response.ok) throw new Error('Failed to generate suggestions');
      
      const data = await response.json();
      setSuggestions(data.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Show fallback suggestions
      setSuggestions([
        `Hi ${otherUser.name}! I'd love to connect and learn more about your work.`,
        `Hey ${otherUser.name}! Your experience looks really interesting.`,
        `Hi ${otherUser.name}! I think we could have some great professional conversations.`
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
    <div className={cn("space-y-3", className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={generateSuggestions}
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        {loading ? 'Generating...' : 'AI Conversation Starters'}
      </Button>

      {showSuggestions && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Suggestions
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSuggestions}
                disabled={loading}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <p className="text-sm">{suggestion}</p>
                <Badge variant="secondary" className="mt-2 text-xs">
                  Click to use
                </Badge>
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-3">
              💡 These suggestions are personalized based on both profiles
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
