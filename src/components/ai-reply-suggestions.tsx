'use client';

import { useState } from 'react';
import { Bot, Loader2, RefreshCw, ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { UserProfile, Message } from '@/lib/data';

interface AiReplySuggestionsProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  messages: Message[];
  onSelectSuggestion: (suggestion: string) => void;
  className?: string;
}

export function AiReplySuggestions({ 
  currentUser, 
  otherUser, 
  messages,
  onSelectSuggestion,
  className 
}: AiReplySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const generateReplySuggestions = async () => {
    setLoading(true);
    try {
      // Get the last 10 messages for context
      const recentMessages = messages.slice(-10).map(msg => ({
        text: msg.text,
        isFromCurrentUser: msg.senderId === currentUser.id
      }));

      const response = await fetch('/api/ai/reply-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentUser,
          otherUser,
          messageHistory: recentMessages
        })
      });

      if (!response.ok) throw new Error('Failed to generate reply suggestions');
      
      const data = await response.json();
      setSuggestions(data.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error generating reply suggestions:', error);
      // Show fallback suggestions based on conversation context
      const lastMessage = messages[messages.length - 1];
      const fallbackSuggestions = generateFallbackReplies(lastMessage?.text || '');
      setSuggestions(fallbackSuggestions);
      setShowSuggestions(true);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackReplies = (lastMessage: string): string[] => {
    const lowerMessage = lastMessage.toLowerCase();
    
    if (lowerMessage.includes('thanks') || lowerMessage.includes('thank you')) {
      return [
        "You're welcome! Happy to help.",
        "No problem at all! Let me know if you have other questions.",
        "Glad I could help! Feel free to reach out anytime."
      ];
    }
    
    if (lowerMessage.includes('?')) {
      return [
        "Great question! Let me think about that...",
        "That's an interesting point. Here's my take:",
        "I'd be happy to share my experience with that."
      ];
    }
    
    if (lowerMessage.includes('project') || lowerMessage.includes('work')) {
      return [
        "That sounds like an exciting project!",
        "I'd love to hear more about your approach.",
        "What tech stack are you using for that?"
      ];
    }
    
    return [
      "That's really interesting!",
      "Thanks for sharing that insight.",
      "I'd love to learn more about that."
    ];
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onSelectSuggestion(suggestion);
    setShowSuggestions(false);
  };

  // Show if there are messages (always available to help with replies)
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {!showSuggestions ? (
        <Button
          variant="outline"
          size="sm"
          onClick={generateReplySuggestions}
          disabled={loading}
          className="w-full text-xs"
        >
          {loading ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <Bot className="h-3 w-3 mr-2" />
          )}
          {loading ? 'Generating...' : 'AI Reply Suggestions'}
        </Button>
      ) : (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-1">
                <Bot className="h-3 w-3 text-blue-600" />
                Smart Replies
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateReplySuggestions}
                disabled={loading}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded-md border border-blue-200 bg-white hover:bg-blue-50 cursor-pointer transition-colors group"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <p className="text-xs flex-1">{suggestion}</p>
                <ArrowUp className="h-3 w-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-muted-foreground">
                💡 AI-generated based on conversation
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
                className="text-[10px] h-5 px-2"
              >
                Hide
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
