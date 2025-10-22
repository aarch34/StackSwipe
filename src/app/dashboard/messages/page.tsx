'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Search } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { type Conversation, type Message, type UserProfile, type Match } from '@/lib/data';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProfileCard } from '@/components/profile-card';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AiConversationSuggestions } from '@/components/ai-conversation-suggestions';
import { AiReplySuggestions } from '@/components/ai-reply-suggestions';

function getConversationId(userId1: string, userId2: string) {
    if (!userId1 || !userId2) {
      console.error("One of the user IDs is undefined.", { userId1, userId2 });
      return 'invalid_conversation_id';
    }
    return [userId1, userId2].sort().join('_');
}

// Strong validation function
function isValidMatch(match: Match, currentUserId: string): boolean {
  try {
    // Check basic structure
    if (!match || !match.userIds || !Array.isArray(match.userIds)) {
      console.log('❌ Invalid match structure:', match);
      return false;
    }

    // Check userIds array
    if (match.userIds.length !== 2) {
      console.log('❌ Invalid userIds length:', match.userIds);
      return false;
    }

    // Check for current user in userIds
    if (!match.userIds.includes(currentUserId)) {
      console.log('❌ Current user not in userIds:', match.userIds);
      return false;
    }

    // Get other user ID
    const otherUserId = match.userIds.find(id => id !== currentUserId);
    if (!otherUserId) {
      console.log('❌ No other user ID found');
      return false;
    }

    // Check users array - ADD NULL CHECKS
    if (!match.users || !Array.isArray(match.users) || match.users.length !== 2) {
      console.log('❌ Invalid users array:', match.users);
      return false;
    }

    // ADD NULL CHECKS for individual users
    const currentUserProfile = match.users.find(u => u && u.id === currentUserId);
    const otherUserProfile = match.users.find(u => u && u.id === otherUserId);

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

  // Filter matches with aggressive validation
  const validMatches = matches.filter(match => user && isValidMatch(match, user.uid));

  // Load messages function
  const loadMessages = async (conversationId: string) => {
    try {
      if (!user) return;
  
      // Get current user's Supabase internal ID first
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
  
      // Transform messages - IMPORTANT: Map sender_id to Firebase UID
      const transformedMessages: Message[] = messagesData?.map(msg => ({
        id: msg.id,
        senderId: msg.sender_id === currentUserData.id ? user.uid : 'other', // Convert to Firebase UID or 'other'
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
      // Load initial messages
      await loadMessages(activeConversation.id);

      // Setup real-time subscription
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
           // Get current user's Supabase internal ID to compare
      const { data: currentUserData } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', user?.uid)
      .single();

    const newMessage = {
      id: payload.new.id,
      senderId: payload.new.sender_id === currentUserData?.id ? user?.uid : 'other',
      text: payload.new.text,
      timestamp: new Date(payload.new.created_at),
    };
    setMessages(prev => [...prev, newMessage]);
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
  }, [activeConversation]);

  useEffect(() => {
      if (scrollAreaRef.current) {
         setTimeout(() => {
            const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                 viewport.scrollTop = viewport.scrollHeight;
            }
         }, 100);
      }
  }, [messages]);

  const handleSelectConversation = async (match: Match) => {
    if (!user) return;
    
    // Double-check validation before proceeding
    if (!isValidMatch(match, user.uid)) {
      console.error('❌ Invalid match passed to handleSelectConversation');
      return;
    }
    
    const otherUserId = match.userIds.find(id => id !== user.uid)!; // Safe because validated
    const currentUserProfile = match.users?.find(p => p.id === user.uid)!;
    const otherUserProfile = match.users?.find(p => p.id === otherUserId)!;

    const conversationData: Conversation = {
      id: match.id, // Use match ID as conversation ID
      userIds: match.userIds,
      users: [currentUserProfile, otherUserProfile],
      messages: []
    };
    
    setActiveConversation(conversationData);
    console.log('✅ Conversation activated successfully');
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !activeConversation || !user) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    // Create optimistic message (show immediately)
    const optimisticMessage = {
      id: `temp_${Date.now()}`,
      senderId: user.uid,
      text: messageText,
      timestamp: new Date(),
    };

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      // Get current user's internal ID
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
          text: messageText
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Replace optimistic message with real message
      setMessages(prev => 
        prev.map(msg => 
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
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      toast({
        title: 'Error',
        description: 'Could not send message. Please try again.',
        variant: 'destructive',
      });
    }
  };
  
  const otherUser = activeConversation?.users.find(u => u.id !== user?.uid);

  if (authLoading) {
      return <div>Pulling threads to weave your network…</div>
  }

  console.log(`📊 Showing ${validMatches.length} valid matches out of ${matches.length} total`);

  return (
    <div className="h-[calc(100vh-2rem)] m-4 grid grid-cols-1 md:grid-cols-12 gap-4">
      <Card className="md:col-span-4 lg:col-span-3 flex flex-col h-full">
        <CardHeader className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search messages..." className="pl-8" />
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-1 p-2">
              {validMatches.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  {matches.length === 0 ? 'No matches yet. Keep swiping!' : 'No valid matches found.'}
                </div>
              )}
              {validMatches.map((match) => {
                const matchUser = match.users?.find(u => u && u.id !== user?.uid);
                if (!user || !matchUser) {
                  console.log('Skipping match due to missing user data:', { user: !!user, matchUser: !!matchUser });
                  return null;
                }
                
                return (
                  <button
                    key={match.id}
                    onClick={() => handleSelectConversation(match)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent',
                      activeConversation?.id === match.id && 'bg-accent'
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={matchUser.photoURL} alt={matchUser.name} />
                      <AvatarFallback>{matchUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 truncate">
                      <p className="font-semibold">{matchUser.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="md:col-span-8 lg:col-span-9 flex flex-col h-full">
        {activeConversation && otherUser ? (
            <>
              <CardHeader className="p-4 border-b">
                <Dialog>
                    <DialogTrigger asChild>
                         <div className="flex items-center gap-4 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors">
                            <Avatar>
                                <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                                <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-lg font-semibold">{otherUser.name}</h2>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg p-0 h-[80vh] flex flex-col">
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
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div className="space-y-4">
                      {loadingMessages && <div className="text-center text-muted-foreground">Pulling threads to weave your network…</div>}
                      {!loadingMessages && messages.length === 0 && <div className="text-center text-muted-foreground">This is the beginning of your conversation. Say hi!</div>}
                      {messages.map((message) => {
  const isCurrentUser = message.senderId === user?.uid;
  
  return (
    <div key={message.id} className={cn('flex items-end gap-2 mb-4', isCurrentUser ? 'justify-end' : 'justify-start')}>
      {!isCurrentUser && otherUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
          <AvatarFallback>{otherUser.name?.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
          "max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-2", 
          isCurrentUser 
            ? 'bg-primary text-primary-foreground rounded-br-sm' 
            : 'bg-secondary text-secondary-foreground rounded-bl-sm'
      )}>
          <p>{message.text}</p>
          <p className={cn(
            "text-xs opacity-70 mt-1",
            isCurrentUser ? "text-right" : "text-left"
          )}>
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
          </p>
      </div>
    </div>
  );
})}

                  </div>
                </ScrollArea>
              </CardContent>

              {/* AI FEATURES SECTION */}
              {activeConversation && otherUser && profile && (
                <div className="px-4 pb-2 space-y-2">
                  {/* AI CONVERSATION SUGGESTIONS (Ice Breakers) - Always available */}
                  <AiConversationSuggestions
                    currentUser={profile}
                    otherUser={otherUser}
                    onSelectSuggestion={(suggestion) => {
                      setNewMessage(suggestion);
                    }}
                  />
                  
                  {/* AI REPLY SUGGESTIONS - Show when there are messages */}
                  {messages.length > 0 && (
                    <AiReplySuggestions
                      currentUser={profile}
                      otherUser={otherUser}
                      messages={messages}
                      onSelectSuggestion={(suggestion) => {
                        setNewMessage(suggestion);
                      }}
                    />
                  )}
                </div>
              )}

              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
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
            <div className="flex flex-col h-full items-center justify-center">
                <CardContent>
                    <p>Select a match to start chatting.</p>
                </CardContent>
            </div>
        )}
      </Card>
    </div>
  );
}
