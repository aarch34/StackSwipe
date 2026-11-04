'use client';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Search,
  Image as ImageIcon,
  X,
  Check,
  CheckCheck,
  Clock,
  Download,
  Maximize2,
} from '@/components/px-icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  type Conversation,
  type Message,
  type UserProfile,
  type Match,
} from '@/lib/data';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProfileCard } from '@/components/profile-card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AiConversationSuggestions } from '@/components/ai-conversation-suggestions';
import { ReportUserDialog } from '@/components/report-user-dialog';

// Resilient match validator
function isValidMatch(match: Match, currentUserId: string): boolean {
  try {
    if (!match || !match.userIds || !Array.isArray(match.userIds)) {
      return false;
    }
    if (!currentUserId || !match.userIds.includes(currentUserId)) {
      return false;
    }
    const otherUser =
      match.users?.find((u) => u && u.id && u.id !== currentUserId) ||
      match.users?.[1] ||
      match.users?.[0];

    return Boolean(otherUser && otherUser.name);
  } catch (error) {
    console.error('Error validating match:', error);
    return false;
  }
}

// Client-side lightweight image compression (max 900px, WebP/JPEG, ~40-80KB)
function compressImage(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(event.target?.result as string);
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Extracts text and image URL regardless of column or embedded format
function parseMessageContent(rawText: string, rawImageUrl?: string | null): { text: string; imageUrl: string | null } {
  let text = rawText || '';
  let imageUrl = rawImageUrl || null;

  if (text.startsWith('[IMG]')) {
    const endIdx = text.indexOf('[/IMG]');
    if (endIdx !== -1) {
      imageUrl = text.substring(5, endIdx);
      text = text.substring(endIdx + 6).trim();
    }
  }

  return { text, imageUrl };
}

// Format date headers (Today, Yesterday, Monday, Oct 26)
function formatMessageDateLabel(dateInput: Date | string): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - messageDay.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Format message time (e.g. 09:41 PM)
function formatMessageTime(dateInput: Date | string): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MessagesContent() {
  const { user, matches, loading: authLoading, profile } = useAuth();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const targetMatchId = searchParams.get('matchId');

  const currentUserId = user?.id || (user as any)?.uid || '';

  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Image attachment state
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    compressedBase64: string;
  } | null>(null);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const validMatches = matches.filter((match) =>
    currentUserId ? isValidMatch(match, currentUserId) : false
  );

  const displayedMatches = validMatches.filter((match) => {
    if (!searchQuery.trim()) return true;
    const matchUser =
      match.users?.find((u) => u && u.id !== currentUserId) ||
      match.users?.[1];
    return matchUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const otherUser =
    activeConversation?.users?.find((u) => u && u.id !== currentUserId) ||
    activeConversation?.users?.[1];

  // Find all match IDs that connect the current user and other user
  const currentMatchIds = useMemo(() => {
    if (!activeConversation || !otherUser) return [];
    const matched = validMatches.filter((m) => m.userIds.includes(otherUser.id));
    const ids = new Set<string>();
    matched.forEach((m) => {
      ids.add(m.id);
      (m.matchIds || []).forEach((id) => ids.add(id));
    });
    if (activeConversation.id) ids.add(activeConversation.id);
    return Array.from(ids);
  }, [activeConversation, otherUser, validMatches]);

  const primaryMatchId = currentMatchIds[0] || activeConversation?.id || '';

  const handleSelectConversation = (match: Match) => {
    if (!currentUserId) return;

    const otherUserProfile =
      match.users?.find((p) => p && p.id !== currentUserId) ||
      match.users?.[1];

    const currentUserProfile =
      match.users?.find((p) => p && p.id === currentUserId) ||
      profile ||
      ({ id: currentUserId, name: 'You' } as UserProfile);

    if (!otherUserProfile) {
      console.warn('No other user profile found in match:', match);
      return;
    }

    const conversationData: Conversation = {
      id: match.id,
      userIds: match.userIds,
      users: [currentUserProfile, otherUserProfile],
      messages: [],
    };

    // Instantly restore cached messages from localStorage for zero-latency history
    if (typeof window !== 'undefined') {
      const cacheKey = `stackswipe_chat_${currentUserId}_${otherUserProfile.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        } catch (e) {
          console.warn('Error reading chat cache:', e);
        }
      }
    }

    setActiveConversation(conversationData);
    setSelectedImage(null);
  };

  // Automatically select conversation if userId or matchId is in URL query parameters
  useEffect(() => {
    if (validMatches.length > 0 && currentUserId) {
      if (targetUserId) {
        const found = validMatches.find(
          (m) =>
            m.userIds?.includes(targetUserId) ||
            m.users?.some((u) => u?.id === targetUserId)
        );
        if (found && (!activeConversation || activeConversation.id !== found.id)) {
          handleSelectConversation(found);
          return;
        }
      }
      if (targetMatchId) {
        const found = validMatches.find((m) => m.id === targetMatchId);
        if (found && (!activeConversation || activeConversation.id !== found.id)) {
          handleSelectConversation(found);
          return;
        }
      }
    }
  }, [targetUserId, targetMatchId, validMatches, currentUserId]);

  // Load message history from Supabase across all linked match IDs
  const loadMessages = async (matchIds: string[], silent = false) => {
    if (!currentUserId || matchIds.length === 0) return;

    if (!silent) setLoadingMessages(true);

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .in('match_id', matchIds)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages from database:', error);
        return;
      }

      const transformed: Message[] = (messagesData || []).map((msg) => {
        const parsed = parseMessageContent(msg.text, msg.image_url);
        return {
          id: msg.id,
          senderId: msg.sender_id,
          text: parsed.text,
          imageUrl: parsed.imageUrl,
          timestamp: new Date(msg.created_at),
          read: Boolean(msg.read),
        };
      });

      setMessages(transformed);

      // Persist in localStorage for instant access on next load
      if (typeof window !== 'undefined' && otherUser) {
        const cacheKey = `stackswipe_chat_${currentUserId}_${otherUser.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(transformed));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Real-time messages + 3-second heartbeat polling fallback for guaranteed delivery
  useEffect(() => {
    if (!activeConversation || currentMatchIds.length === 0) {
      setMessages([]);
      return;
    }

    // 1. Initial history fetch
    loadMessages(currentMatchIds);

    // 2. Real-time PostgreSQL changes subscription
    const channelName = `realtime_chat_${activeConversation.id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const incoming = payload.new;
          if (!incoming) return;

          // Check if this message belongs to any of our match IDs or users
          const isOurConversation =
            currentMatchIds.includes(incoming.match_id) ||
            incoming.sender_id === otherUser?.id ||
            incoming.sender_id === currentUserId;

          if (!isOurConversation) return;

          const parsed = parseMessageContent(incoming.text, incoming.image_url);
          const newMsg: Message = {
            id: incoming.id,
            senderId: incoming.sender_id,
            text: parsed.text,
            imageUrl: parsed.imageUrl,
            timestamp: new Date(incoming.created_at),
            read: Boolean(incoming.read),
          };

          setMessages((prev) => {
            // Deduplicate if already present
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev;
            }
            // Replace matching temp message
            const tempIdx = prev.findIndex(
              (m) =>
                m.id.startsWith('temp_') &&
                m.senderId === newMsg.senderId &&
                m.text === newMsg.text
            );
            if (tempIdx !== -1) {
              const updated = [...prev];
              updated[tempIdx] = newMsg;
              return updated;
            }
            const updated = [...prev, newMsg];
            // Update cache
            if (typeof window !== 'undefined' && otherUser) {
              localStorage.setItem(
                `stackswipe_chat_${currentUserId}_${otherUser.id}`,
                JSON.stringify(updated)
              );
            }
            return updated;
          });
        }
      )
      .subscribe();

    // 3. Heartbeat polling fallback (every 3.5s) to guarantee messages arrive even if WebSockets disconnect
    const interval = setInterval(() => {
      loadMessages(currentMatchIds, true);
    }, 3500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeConversation?.id, currentMatchIds.join(','), currentUserId, otherUser?.id]);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLDivElement | null;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 70);
    }
  }, [messages.length, selectedImage]);

  // Handle image file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file',
        description: 'Please select an image file (PNG, JPG, WebP, etc.)',
        variant: 'destructive',
      });
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      const compressedBase64 = await compressImage(file);
      setSelectedImage({
        file,
        previewUrl,
        compressedBase64,
      });
    } catch (err) {
      console.error('Error compressing image:', err);
      toast({
        title: 'Error',
        description: 'Could not load image. Please try another one.',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !currentUserId) return;

    const messageText = newMessage.trim();
    const hasImage = Boolean(selectedImage?.compressedBase64);

    if (!messageText && !hasImage) return;

    setIsSending(true);
    const imagePayload = selectedImage?.compressedBase64 || null;
    const optimisticId = `temp_${Date.now()}`;

    // Reset input fields immediately for snappy UI
    setNewMessage('');
    handleRemoveImage();

    const optimisticMessage: Message = {
      id: optimisticId,
      senderId: currentUserId,
      text: messageText,
      imageUrl: imagePayload,
      timestamp: new Date(),
      read: false,
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // 1. First attempt: Insert with dedicated image_url column
      let result = await supabase
        .from('messages')
        .insert({
          match_id: primaryMatchId,
          sender_id: currentUserId,
          text: messageText,
          image_url: imagePayload,
        })
        .select()
        .single();

      // 2. Fallback: If image_url column doesn't exist yet, embed via [IMG] tag in text
      if (result.error && (result.error.message?.includes('image_url') || result.error.code === '42703')) {
        const embeddedText = imagePayload
          ? `[IMG]${imagePayload}[/IMG]${messageText}`
          : messageText;

        result = await supabase
          .from('messages')
          .insert({
            match_id: primaryMatchId,
            sender_id: currentUserId,
            text: embeddedText,
          })
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      const confirmedData = result.data;
      const parsed = parseMessageContent(confirmedData.text, confirmedData.image_url);

      const confirmedMessage: Message = {
        id: confirmedData.id,
        senderId: confirmedData.sender_id,
        text: parsed.text,
        imageUrl: parsed.imageUrl,
        timestamp: new Date(confirmedData.created_at),
        read: Boolean(confirmedData.read),
      };

      setMessages((prev) => {
        const next = prev.map((msg) =>
          msg.id === optimisticId ? confirmedMessage : msg
        );
        if (typeof window !== 'undefined' && otherUser) {
          localStorage.setItem(
            `stackswipe_chat_${currentUserId}_${otherUser.id}`,
            JSON.stringify(next)
          );
        }
        return next;
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId));
      toast({
        title: 'Error sending message',
        description: 'Could not deliver message. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center text-sm text-muted-foreground">
        Pulling threads to weave your network…
      </div>
    );
  }

  return (
    <div className="h-full flex-1 min-h-0 p-2 sm:p-3 overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-3">
      {/* LEFT: conversation list */}
      <Card className="flex flex-col h-full min-h-0 overflow-hidden bg-card md:col-span-4 lg:col-span-3">
        <CardHeader className="flex-shrink-0 border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search matches..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {displayedMatches.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {matches.length === 0
                    ? 'No matches yet. Keep swiping!'
                    : searchQuery
                    ? 'No matches found for your search.'
                    : 'No valid matches found.'}
                </div>
              )}

              {displayedMatches.map((match) => {
                const matchUser =
                  match.users?.find((u) => u && u.id !== currentUserId) ||
                  match.users?.[1];
                if (!matchUser) return null;

                const isSelected = otherUser?.id === matchUser.id;

                return (
                  <button
                    key={match.id}
                    onClick={() => handleSelectConversation(match)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-all',
                      'hover:bg-accent/70',
                      isSelected && 'bg-accent text-accent-foreground'
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2">
                        <AvatarImage src={matchUser.photoURL} alt={matchUser.name} />
                        <AvatarFallback className="bg-accent font-headline text-xl font-bold text-accent-foreground">
                          {matchUser.name?.charAt(0) ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                    <div className="flex-1 truncate">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground truncate">{matchUser.name}</p>
                      </div>
                      {matchUser.headline ? (
                        <p className="text-xs text-muted-foreground truncate">{matchUser.headline}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground truncate">
                          {matchUser.jobTitle ? `${matchUser.jobTitle}` : 'Connected match'}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* RIGHT: active conversation */}
      <Card className="flex flex-col h-full min-h-0 overflow-hidden bg-card md:col-span-8 lg:col-span-9">
        {activeConversation && otherUser ? (
          <>
            {/* Conversation Header */}
            <CardHeader className="flex-shrink-0 flex items-center justify-between gap-3 border-b p-3 bg-background/60 backdrop-blur-md">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-accent/60 group">
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2">
                        <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                        <AvatarFallback className="bg-accent font-headline text-xl font-bold text-accent-foreground">
                          {otherUser.name?.charAt(0) ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-semibold group-hover:underline flex items-center gap-1.5">
                        {otherUser.name}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate max-w-[280px] sm:max-w-md">
                        {otherUser.headline || otherUser.jobTitle || otherUser.company || 'Tap to view full profile'}
                      </p>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="flex h-[85vh] max-h-[85vh] w-[94vw] max-w-lg flex-col p-0 overflow-hidden bg-card text-card-foreground">
                  <DialogHeader className="sr-only">
                    <DialogTitle>User Profile: {otherUser.name}</DialogTitle>
                    <DialogDescription>
                      This dialog displays the detailed profile of {otherUser.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <ProfileCard profile={otherUser} variant="dialog" />
                </DialogContent>
              </Dialog>

              {/* Safety Report Action */}
              <ReportUserDialog
                reportedUser={otherUser}
                relevantMessageIds={messages
                  .slice(-5)
                  .map((m) => m.id)
                  .filter((id) => !id.startsWith('temp_'))}
              />
            </CardHeader>

            {/* Messages Scroll Area */}
            <CardContent className="flex-1 min-h-0 overflow-hidden p-0 relative">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="p-4 space-y-3">
                  {loadingMessages && messages.length === 0 && (
                    <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                      <Clock className="w-4 h-4 animate-spin" />
                      Loading your conversation history…
                    </div>
                  )}

                  {!loadingMessages && messages.length === 0 && (
                    <div className="py-12 text-center text-xs text-muted-foreground max-w-sm mx-auto space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Beginning of conversation with {otherUser.name}
                      </p>
                      <p>Send a message or share an image to break the ice and start networking!</p>
                    </div>
                  )}

                  {/* Render messages grouped by Date */}
                  {messages.map((message, index) => {
                    const isCurrentUser = message.senderId === currentUserId;
                    const currentDateLabel = formatMessageDateLabel(message.timestamp);
                    const prevMessage = index > 0 ? messages[index - 1] : null;
                    const prevDateLabel = prevMessage ? formatMessageDateLabel(prevMessage.timestamp) : null;
                    const showDateSeparator = currentDateLabel !== prevDateLabel;

                    const formattedTime = formatMessageTime(message.timestamp);
                    const isSendingTemp = message.id.startsWith('temp_');

                    return (
                      <div key={message.id}>
                        {/* Date Divider */}
                        {showDateSeparator && (
                          <div className="flex justify-center my-4 select-none">
                            <span className="border-2 bg-card px-3 py-1 font-label text-[10px] text-foreground">
                              {currentDateLabel}
                            </span>
                          </div>
                        )}

                        {/* Message Row */}
                        <div
                          className={cn(
                            'mb-2 flex items-end gap-2',
                            isCurrentUser ? 'justify-end' : 'justify-start'
                          )}
                        >
                          {!isCurrentUser && (
                            <Avatar className="h-7 w-7 flex-shrink-0 border-2">
                              <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                              <AvatarFallback className="bg-accent text-xs text-accent-foreground">
                                {otherUser.name?.charAt(0) ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                          )}

                          <div
                            className={cn(
                              'group relative max-w-[82%] sm:max-w-[70%] animate-pop border-2 px-4 py-2.5 text-sm',
                              isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-card-foreground'
                            )}
                          >
                            {/* Image inside message if present */}
                            {message.imageUrl && (
                              <div className="relative mb-2 overflow-hidden border-2 bg-black/40 group/img">
                                <img
                                  src={message.imageUrl}
                                  alt="Attachment"
                                  className="max-h-72 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                  onClick={() => setPreviewLightboxUrl(message.imageUrl || null)}
                                />
                                <button
                                  type="button"
                                  onClick={() => setPreviewLightboxUrl(message.imageUrl || null)}
                                  className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] text-white opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm"
                                >
                                  <Maximize2 className="h-3 w-3" /> Full Size
                                </button>
                              </div>
                            )}

                            {/* Text content if present */}
                            {message.text && (
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {message.text}
                              </p>
                            )}

                            {/* Message Timestamp & Delivery Status */}
                            <div
                              className={cn(
                                'mt-1 flex items-center gap-1 text-[10px] opacity-80',
                                isCurrentUser ? 'justify-end' : 'justify-start text-muted-foreground'
                              )}
                            >
                              <span>{formattedTime}</span>
                              {isCurrentUser && (
                                <span className="ml-0.5 inline-flex items-center">
                                  {isSendingTemp ? (
                                    <Clock className="h-3 w-3 animate-spin" />
                                  ) : message.read ? (
                                    <span title="Read">
                                      <CheckCheck className="h-3.5 w-3.5" />
                                    </span>
                                  ) : (
                                    <span title="Delivered">
                                      <CheckCheck className="h-3.5 w-3.5 opacity-70" />
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>

            {/* AI Suggestions Toolbar */}
            {activeConversation && otherUser && profile && (
              <div className="flex-shrink-0 space-y-1.5 border-t-2 px-3 py-1.5 bg-background">
                <AiConversationSuggestions
                  currentUser={profile}
                  otherUser={otherUser}
                  onSelectSuggestion={(suggestion) => setNewMessage(suggestion)}
                />
              </div>
            )}

            {/* Selected Image Attachment Preview Banner */}
            {selectedImage && (
              <div className="flex-shrink-0 flex items-center gap-3 border-t-2 bg-muted px-3 py-2 animate-in slide-in-from-bottom-2">
                <div className="relative h-14 w-14 overflow-hidden border-2 flex-shrink-0">
                  <img
                    src={selectedImage.previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {selectedImage.file.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(selectedImage.file.size / 1024).toFixed(0)} KB • Ready to send with message
                  </p>
                </div>
              </div>
            )}

            {/* Input & Send Bar */}
            <div className="flex-shrink-0 border-t-2 p-2.5 sm:p-3 bg-card">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  id="chat-image-upload"
                />

                {/* Image Attach Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center border-2 bg-card text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title="Attach an image"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>

                {/* Message Input Field */}
                <Input
                  placeholder={
                    selectedImage
                      ? 'Add a caption (optional)...'
                      : `Message ${otherUser.name}...`
                  }
                  className="flex-1 rounded-xl bg-background border-border/80"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                />

                {/* Send Button */}
                <Button
                  type="submit"
                  size="icon"
                  
                  disabled={(!newMessage.trim() && !selectedImage) || isSending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <CardTitle className="mb-2 text-lg">Messages</CardTitle>
            <CardDescription className="max-w-sm text-sm">
              Select a match on the left to start chatting. Your conversations,
              message history, and media will appear here.
            </CardDescription>
          </div>
        )}
      </Card>

      {/* Lightbox Modal for Fullscreen Image Preview */}
      {previewLightboxUrl && (
        <Dialog open={Boolean(previewLightboxUrl)} onOpenChange={(open) => !open && setPreviewLightboxUrl(null)}>
          <DialogContent className="max-w-3xl border-none bg-black/90 p-2 text-white backdrop-blur-xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
              <DialogDescription>Full size preview of the shared image</DialogDescription>
            </DialogHeader>
            <div className="relative flex max-h-[85vh] w-full flex-col items-center justify-center overflow-hidden rounded-2xl">
              <img
                src={previewLightboxUrl}
                alt="Enlarged preview"
                className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl"
              />
              <div className="mt-3 flex items-center gap-3">
                <a
                  href={previewLightboxUrl}
                  download="stackswipe-image.jpg"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center text-sm text-muted-foreground">
          Pulling threads to weave your network…
        </div>
      }
    >
      <MessagesContent />
    </Suspense>
  );
}
