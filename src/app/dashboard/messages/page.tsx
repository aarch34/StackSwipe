'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Search } from 'lucide-react';
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
import { AiReplySuggestions } from '@/components/ai-reply-suggestions';

function getConversationId(userId1: string, userId2: string) {
  if (!userId1 || !userId2) {
    console.error('One of the user IDs is undefined.', { userId1, userId2 });
    return 'invalid_conversation_id';
  }
  return [userId1, userId2].sort().join('_');
}

// Strong validation function
function isValidMatch(match: Match, currentUserId: string): boolean {
  try {
    if (!match || !match.userIds || !Array.isArray(match.userIds)) {
      console.log('❌ Invalid match structure:', match);
      return false;
    }

    if (match.userIds.length !== 2) {
      console.log('❌ Invalid userIds length:', match.userIds);
      return false;
    }

    if (!match.userIds.includes(currentUserId)) {
      console.log('❌ Current user not in userIds:', match.userIds);
      return false;
    }

    const otherUserId = match.userIds.find((id) => id !== currentUserId);
    if (!otherUserId) {
      console.log('❌ No other user ID found');
      return false;
    }

    if (!match.users || !Array.isArray(match.users) || match.users.length !== 2) {
      console.log('❌ Invalid users array:', match.users);
      return false;
    }

    const currentUserProfile = match.users.find((u) => u && u.id === currentUserId);
    const otherUserProfile = match.users.find((u) => u && u.id === otherUserId);

    if (!currentUserProfile) {
      console.log('❌ Current user profile not found');
      return false;
    }

    if (!otherUserProfile || !otherUserProfile.name) {
      console.log('❌ Invalid other user profile:', otherUserProfile);
      return false;
    }

    console.log('✅ Valid match found:', otherUserProfile.name);
    return true;
  } catch (error) {
    console.error('❌ Error validating match:', error);
    return false;
  }
}

export default function MessagesPage() {
  const { user, matches, loading: authLoading, profile } = useAuth();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const validMatches = matches.filter((match) => user && isValidMatch(match, user.uid));

  const loadMessages = async (conversationId: string) => {
    try {
      if (!user) return;

      const { data: currentUserData } = await supabase
        .from('users')
        .select('id, firebase_uid')
        .eq('firebase_uid', user.uid)
        .single();

      if (!currentUserData) {
        console.error('Current user not found');
        return;
      }

      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const transformedMessages: Message[] =
        messagesData?.map((msg) => ({
          id: msg.id,
          senderId: msg.sender_id === currentUserData.id ? user.uid : 'other',
          text: msg.text,
          timestamp: new Date(msg.created_at),
        })) || [];

      console.log('Transformed messages:', transformedMessages);
      setMessages(transformedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Real-time messages setup
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    let subscription: any;

    const setupRealtimeSubscription = async () => {
      await loadMessages(activeConversation.id);

      subscription = supabase
        .channel(`messages_${activeConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `match_id=eq.${activeConversation.id}`,
          },
          async (payload) => {
            console.log('New message received:', payload.new);
            const { data: currentUserData } = await supabase
              .from('users')
              .select('id')
              .eq('firebase_uid', user?.uid)
              .single();

            const newMsg: Message = {
              id: payload.new.id,
              senderId: payload.new.sender_id === currentUserData?.id ? user?.uid! : 'other',
              text: payload.new.text,
              timestamp: new Date(payload.new.created_at),
            };
            setMessages((prev) => [...prev, newMsg]);
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [activeConversation, user]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLDivElement | null;
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  const handleSelectConversation = async (match: Match) => {
    if (!user) return;

    if (!isValidMatch(match, user.uid)) {
      console.error('❌ Invalid match passed to handleSelectConversation');
      return;
    }

    const otherUserId = match.userIds.find((id) => id !== user.uid)!;
    const currentUserProfile = match.users?.find((p) => p.id === user.uid)!;
    const otherUserProfile = match.users?.find((p) => p.id === otherUserId)!;

    const conversationData: Conversation = {
      id: match.id,
      userIds: match.userIds,
      users: [currentUserProfile, otherUserProfile],
      messages: [],
    };

    setActiveConversation(conversationData);
    console.log('✅ Conversation activated successfully');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !activeConversation || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    const optimisticMessage: Message = {
      id: `temp_${Date.now()}`,
      senderId: user.uid,
      text: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { data: currentUserData } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', user.uid)
        .single();

      if (!currentUserData) {
        throw new Error('Current user not found');
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: activeConversation.id,
          sender_id: currentUserData.id,
          text: messageText,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? {
                id: data.id,
                senderId: user.uid,
                text: data.text,
                timestamp: new Date(data.created_at),
              }
            : msg
        )
      );
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      toast({
        title: 'Error',
        description: 'Could not send message. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const otherUser = activeConversation?.users.find((u) => u.id !== user?.uid);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center text-sm text-muted-foreground">
        Pulling threads to weave your network…
      </div>
    );
  }

  console.log(`📊 Showing ${validMatches.length} valid matches out of ${matches.length} total`);

  return (
    <div className="m-4 grid min-h-[calc(100vh-3rem)] grid-cols-1 gap-4 rounded-3xl bg-gradient-to-br from-background via-background/60 to-background p-2 md:grid-cols-12">
      {/* LEFT: conversation list */}
      <Card className="flex h-full flex-col border-border/70 bg-background/80 rounded-2xl md:col-span-4 lg:col-span-3">
        <CardHeader className="border-b p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search matches..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {validMatches.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {matches.length === 0
                    ? 'No matches yet. Keep swiping!'
                    : 'No valid matches found.'}
                </div>
              )}

              {validMatches.map((match) => {
                const matchUser = match.users?.find(
                  (u) => u && u.id !== user?.uid
                );
                if (!user || !matchUser) return null;

                return (
                  <button
                    key={match.id}
                    onClick={() => handleSelectConversation(match)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-3 text-left text-sm transition-colors',
                      'hover:bg-accent/70',
                      activeConversation?.id === match.id && 'bg-accent'
                    )}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={matchUser.photoURL} alt={matchUser.name} />
                      <AvatarFallback>{matchUser.name?.charAt(0) ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <p className="font-semibold">{matchUser.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* RIGHT: active conversation */}
      <Card className="flex h-full flex-col border-border/70 bg-background/80 rounded-2xl md:col-span-8 lg:col-span-9">
        {activeConversation && otherUser ? (
          <>
            <CardHeader className="flex items-center justify-between gap-3 border-b p-4">
              <Dialog>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                      <AvatarFallback>{otherUser.name?.charAt(0) ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-base font-semibold">{otherUser.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        Tap to view full profile
                      </p>
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="flex h-[80vh] max-w-lg flex-col p-0">
                  <DialogHeader className="sr-only">
                    <DialogTitle>User Profile: {otherUser.name}</DialogTitle>
                    <DialogDescription>
                      This dialog displays the detailed profile of {otherUser.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <ProfileCard profile={otherUser} variant="dialog" />
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="flex-1 overflow-hidden p-0">
              <ScrollArea className="h-full" ref={scrollAreaRef}>
                <div className="space-y-4 p-4">
                  {loadingMessages && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Pulling threads to weave your network…
                    </div>
                  )}

                  {!loadingMessages && messages.length === 0 && (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      This is the beginning of your conversation. Say hi!
                    </div>
                  )}

                  {messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.uid;

                    return (
                      <div
                        key={message.id}
                        className={cn(
                          'mb-2 flex items-end gap-2',
                          isCurrentUser ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {!isCurrentUser && otherUser && (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                            <AvatarFallback>
                              {otherUser.name?.charAt(0) ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm',
                            isCurrentUser
                              ? 'rounded-br-sm bg-primary text-primary-foreground'
                              : 'rounded-bl-sm bg-secondary text-secondary-foreground'
                          )}
                        >
                          <p>{message.text}</p>
                          <p
                            className={cn(
                              'mt-1 text-[10px] opacity-70',
                              isCurrentUser ? 'text-right' : 'text-left'
                            )}
                          >
                            {message.timestamp
                              ? new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Sending...'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>

            {activeConversation && otherUser && profile && (
              <div className="space-y-2 border-t px-4 pb-2 pt-3">
                <AiConversationSuggestions
                  currentUser={profile}
                  otherUser={otherUser}
                  onSelectSuggestion={(suggestion) => setNewMessage(suggestion)}
                />
                {messages.length > 0 && (
                  <AiReplySuggestions
                    currentUser={profile}
                    otherUser={otherUser}
                    messages={messages}
                    onSelectSuggestion={(suggestion) => setNewMessage(suggestion)}
                  />
                )}
              </div>
            )}

            <div className="border-t p-3">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder="Type a message..."
                  className="flex-1"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <Button type="submit" size="icon">
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <CardTitle className="mb-2 text-lg">Messages</CardTitle>
            <CardDescription className="max-w-sm text-sm">
              Select a match on the left to start chatting. Your conversations
              will appear here.
            </CardDescription>
          </div>
        )}
      </Card>
    </div>
  );
}
