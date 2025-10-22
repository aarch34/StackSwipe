'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User } from 'lucide-react';
import { postChatMessage } from '@/actions/chatbot';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function StackBotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi! I\'m StackBot, your tech assistant. I can help you with coding questions, learning pathways, job market insights, and using StackSwipe effectively. What would you like to know?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await postChatMessage({ message: currentInput });
      
      if (response.error) {
        throw new Error(response.error);
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response || 'Sorry, I couldn\'t process that request. Please try asking about coding, technology, or the job market.',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('StackBot error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I\'m having trouble connecting right now. Please try again with a question about programming, web development, or career advice.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 h-screen">
      <Card className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <CardTitle>StackBot - Your Tech Assistant</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Ask me about coding, technology, job market, and StackSwipe usage
          </p>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
          <ScrollArea className="flex-1 w-full">
            <div className="space-y-4 pr-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 w-full ${
                    message.isUser ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!message.isUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100">
                        <Bot className="h-4 w-4 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 break-words ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                    style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.text}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  
                  {message.isUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100">
                      <Bot className="h-4 w-4 text-blue-600 animate-pulse" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <p className="text-sm">StackBot is thinking...</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex-shrink-0">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about coding, tech careers, job market, or StackSwipe..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center mt-2">
              StackBot specializes in programming, technology, job market insights, and StackSwipe help
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
