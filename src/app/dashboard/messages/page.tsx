

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
import { collection, doc, onSnapshot, addDoc, serverTimestamp, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProfileCard } from '@/components/profile-card';


function getConversationId(userId1: string, userId2: string) {
    if (!userId1 || !userId2) {
      console.error("One of the user IDs is undefined.", { userId1, userId2 });
      // Return a value or throw an error that makes it clear something is wrong
      return 'invalid_conversation_id';
    }
    return [userId1, userId2].sort().join('_');
}


export default function MessagesPage() {
  const { user, matches, loading: authLoading } = useAuth();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeConversation || !user) return; 

    setLoadingMessages(true);
    const otherUserId = activeConversation.users.find(u => u.id !== user!.uid)?.id;
    if (!otherUserId) {
        setLoadingMessages(false);
        return;
    }

    const convId = getConversationId(user!.uid, otherUserId);
    const messagesQuery = query(collection(db, 'chats', convId, 'messages'), orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
        const newMessages: Message[] = [];
        querySnapshot.forEach((doc) => {
            newMessages.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(newMessages);
        setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeConversation, user]);

  useEffect(() => {
      // Auto-scroll to bottom
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
    
    const otherUserId = match.userIds.find(id => id !== user.uid);
    if (!otherUserId) return;
    
    const currentUserProfile = match.users?.find(p => p.id === user.uid);
    const otherUserProfile = match.users?.find(p => p.id === otherUserId);
    
    if (!currentUserProfile || !otherUserProfile) {
        console.error("Could not find profiles for conversation");
        return;
    }

    const convId = getConversationId(user.uid, otherUserId);
    const convRef = doc(db, 'chats', convId);
    const convSnap = await getDoc(convRef);

    let conversationData: Conversation;

    if (convSnap.exists()) {
        conversationData = { id: convSnap.id, ...(convSnap.data() as Omit<Conversation, 'id'>) };
        conversationData.users = [currentUserProfile, otherUserProfile];
    } else {
        conversationData = {
            id: convId,
            userIds: [user.uid, otherUserId],
            users: [ currentUserProfile, otherUserProfile],
            messages: []
        };
        await setDoc(convRef, { userIds: conversationData.userIds, createdAt: serverTimestamp() });
    }
    setActiveConversation(conversationData);
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !activeConversation || !user) return;

    const otherUserId = activeConversation.users.find(u => u.id !== user!.uid)?.id;
    if(!otherUserId) return;
    
    const convId = getConversationId(user.uid, otherUserId);
    const messagesCollection = collection(db, 'chats', convId, 'messages');

    await addDoc(messagesCollection, {
        senderId: user.uid,
        text: newMessage,
        timestamp: serverTimestamp(),
    });
    
    setNewMessage('');
  };
  
  const otherUser = activeConversation?.users.find(u => u.id !== user?.uid);

  if (authLoading) {
      return <div>Pulling threads to weave your network…</div>
  }

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
              {matches.length === 0 && <div className="p-4 text-center text-muted-foreground">No matches yet. Keep swiping!</div>}
              {matches.map((match) => {
                  const matchUser = match.users?.find(u => u.id !== user?.uid);
                  if (!user || !matchUser || matchUser.id === user?.uid) return null;
                  const convId = getConversationId(user.uid, matchUser.id);
                  return (
                    <button
                      key={match.id}
                      onClick={() => handleSelectConversation(match)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent',
                        activeConversation?.id === convId && 'bg-accent'
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
                         <div className="flex items-center gap-4 cursor-pointer hover:bg-accent p-2 rounded-md">
                            <Avatar>
                                <AvatarImage src={otherUser.photoURL} alt={otherUser.name} />
                                <AvatarFallback>{otherUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-lg font-semibold">{otherUser.name}</h2>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-md p-0">
                        <DialogHeader className="sr-only">
                          <DialogTitle>User Profile: {otherUser.name}</DialogTitle>
                          <DialogDescription>
                            This dialog displays the detailed profile of {otherUser.name}.
                          </DialogDescription>
                        </DialogHeader>
                        <ProfileCard profile={otherUser} />
                    </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full" ref={scrollAreaRef}>
                  <div className="space-y-4">
                      {loadingMessages && <div className="text-center text-muted-foreground">Pulling threads to weave your network…</div>}
                      {!loadingMessages && messages.length === 0 && <div className="text-center text-muted-foreground">This is the beginning of your conversation. Say hi!</div>}
                      {messages.map((message) => {
                          const senderIsMe = message.senderId === user?.uid;
                          const messageSenderProfile = activeConversation.users.find(u => u.id === message.senderId);

                          return (
                              <div key={message.id} className={cn('flex items-end gap-2', senderIsMe ? 'justify-end' : 'justify-start')}>
                                  {!senderIsMe && (
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={messageSenderProfile?.photoURL} alt={messageSenderProfile?.name} />
                                      <AvatarFallback>{messageSenderProfile?.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                  )}
                                  <div className={cn(
                                      "max-w-xs md:max-w-md lg:max-w-lg rounded-xl px-4 py-2", 
                                      senderIsMe ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                                  )}>
                                      <p>{message.text}</p>
                                      <p className="text-xs opacity-70 mt-1 text-right">
                                          {message.timestamp ? (message.timestamp as Timestamp).toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                                      </p>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
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
