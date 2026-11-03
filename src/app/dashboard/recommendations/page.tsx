'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChatMarkdown } from '@/components/chat-markdown';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Copy,
  Check,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  'How do I build a strong PM portfolio without prior PM title?',
  'Explain Next.js App Router vs Pages Router with pros & cons',
  'What tech stack should I learn in 2026 for Fullstack roles?',
  'Give me 5 great icebreaker questions to ask senior devs',
];

export default function StackBotPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      text: `👋 **Welcome to StackBot!**\n\nI'm your AI networking and tech assistant on StackSwipe. I can help you with:\n- **Coding & Architecture**: Next.js, React, TypeScript, APIs, and databases\n- **Career & Interview Prep**: PM & SWE roadmaps, resume tips, portfolio reviews\n- **StackSwipe Networking**: Icebreakers, matching tips, and collaboration ideas\n\nWhat would you like to explore today?`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: 'Copied to clipboard',
        description: 'Message content copied.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        variant: 'destructive',
      });
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        text: `👋 New chat started! How can I help you with your coding, tech career, or networking today?`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessageWithText = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      text: trimmed,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('Server returned invalid response');
      }

      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const botMessage: Message = {
        id: crypto.randomUUID(),
        text: data.message || 'No response generated.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (err: any) {
      console.error('Chatbot response error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: `⚠️ **Error receiving response:** ${
            err?.message || 'Could not connect to StackBot. Please try again.'
          }`,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    sendMessageWithText(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 lg:p-8 max-w-5xl h-[calc(100vh-4rem)] flex flex-col">
      <Card className="flex-1 flex flex-col overflow-hidden border-border/80 shadow-2xl backdrop-blur-xl bg-card/95">
        {/* HEADER */}
        <CardHeader className="flex-shrink-0 border-b border-border/70 py-3.5 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-sm">
                <Bot className="h-5 w-5" />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-card" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-headline text-lg sm:text-xl font-bold tracking-tight">
                    StackBot
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/30 text-primary font-medium">
                    AI Assistant
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground">
                  Powered by high-speed Groq LLMs · Tech, Career, & Networking
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearChat}
              disabled={isLoading}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </div>
        </CardHeader>

        {/* CHAT MESSAGES AREA */}
        <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden bg-muted/10">
          <ScrollArea className="flex-1 h-full px-4 sm:px-6 py-4">
            <div className="space-y-5 max-w-4xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 w-full group ${
                    message.isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* Bot Avatar */}
                  {!message.isUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-1 border border-primary/20 shadow-sm bg-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`flex flex-col ${
                      message.isUser ? 'items-end' : 'items-start'
                    } max-w-[88%] sm:max-w-[80%]`}
                  >
                    <div
                      className={`relative rounded-2xl px-4 py-3 shadow-sm transition-all ${
                        message.isUser
                          ? 'bg-primary text-primary-foreground font-medium rounded-tr-sm'
                          : 'bg-card border border-border/80 text-foreground rounded-tl-sm'
                      }`}
                    >
                      {message.isUser ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.text}
                        </p>
                      ) : (
                        <ChatMarkdown content={message.text} />
                      )}
                    </div>

                    {/* Metadata / Action Bar */}
                    <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-muted-foreground">
                      <span>
                        {message.timestamp
                          ? new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>

                      {!message.isUser && (
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(message.id, message.text)}
                          className="opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity flex items-center gap-1 text-[11px]"
                          title="Copy response"
                        >
                          {copiedId === message.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-500" />
                              <span className="text-emerald-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* User Avatar */}
                  {message.isUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-1 border border-border bg-muted">
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {/* Bot Thinking / Loading State */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0 mt-1 border border-primary/20 shadow-sm bg-primary/10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border/80 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs font-medium text-muted-foreground animate-pulse">
                      StackBot is formulating a response…
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* SUGGESTED PROMPT CHIPS */}
          {messages.length <= 2 && (
            <div className="px-4 sm:px-6 py-2 border-t border-border/50 bg-background/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5 font-medium">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                <span>Suggested questions:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessageWithText(prompt)}
                    disabled={isLoading}
                    className="text-xs text-left bg-card hover:bg-muted/80 border border-border/70 rounded-full px-3 py-1 text-muted-foreground hover:text-foreground transition-all truncate max-w-full"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* INPUT BAR */}
          <div className="p-3 sm:p-4 border-t border-border/70 bg-card">
            <div className="flex items-center gap-2 max-w-4xl mx-auto">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about coding, tech careers, job market, or StackSwipe..."
                disabled={isLoading}
                className="flex-1 h-11 text-sm bg-background border-border/80 focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="h-11 w-11 bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0 rounded-xl shadow-md transition-all active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            <div className="text-[11px] text-muted-foreground/75 text-center mt-2 flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-primary/70" />
              <span>StackBot may produce formatting. Press Enter to send.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
