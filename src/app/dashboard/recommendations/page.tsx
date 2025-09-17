

'use client';
import { useState, useEffect } from 'react';
import { Sparkles, Bot, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getRecommendations } from '@/actions/recommendations';
import { postChatMessage } from '@/actions/chatbot';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

type ChatMessage = {
    sender: 'user' | 'bot';
    text: string;
};

export default function RecommendationsPage() {
    const { profile: currentUser, loading: authLoading } = useAuth();
    const [networkingGoals, setNetworkingGoals] = useState('Find a mentor in frontend development and connect with potential teammates for a side project.');
    const [profileDetails, setProfileDetails] = useState('');

    const [loading, setLoading] = useState(false);
    const [recommendations, setRecommendations] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [chatLoading, setChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');

    useEffect(() => {
        if (currentUser) {
            setProfileDetails(JSON.stringify({
                headline: currentUser.headline,
                bio: currentUser.bio,
                techStack: currentUser.techStack,
                interests: currentUser.interests,
            }, null, 2));
        }
    }, [currentUser]);


    const handleGetRecommendations = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setRecommendations([]);

        const result = await getRecommendations({ networkingGoals, profileDetails });

        if ('error' in result && result.error) {
            setError(result.error);
        } else if ('recommendedProfiles' in result) {
            setRecommendations(result.recommendedProfiles);
        }
        
        setLoading(false);
    };

    const handleSendChatMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const newUserMessage: ChatMessage = { sender: 'user', text: chatInput };
        setChatMessages(prev => [...prev, newUserMessage]);
        setChatInput('');
        setChatLoading(true);
        setChatError(null);

        const result = await postChatMessage({ message: chatInput });

        if (result.error) {
            setChatError(result.error);
        } else {
            const botMessage: ChatMessage = { sender: 'bot', text: result.response };
            setChatMessages(prev => [...prev, botMessage]);
        }
        setChatLoading(false);
    };

    return (
        <main className="container mx-auto p-4 md:p-8">
            <div className="grid gap-8 lg:grid-cols-2">
                <div>
                    <Card className="mb-8 shadow-lg">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl flex items-center gap-2">
                                <Sparkles className="text-primary" />
                                AI Profile Recommendations
                            </CardTitle>
                            <CardDescription>
                                Let our AI suggest relevant profiles based on your goals and profile.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             {authLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-24 w-full" />
                                    <Skeleton className="h-32 w-full" />
                                    <Skeleton className="h-10 w-40" />
                                </div>
                            ) : (
                                <form onSubmit={handleGetRecommendations} className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="networking-goals">Your Networking Goals</Label>
                                        <Textarea
                                            id="networking-goals"
                                            value={networkingGoals}
                                            onChange={(e) => setNetworkingGoals(e.target.value)}
                                            placeholder="e.g., Find a mentor, look for job referrals, connect with other developers..."
                                            rows={3}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="profile-details">Your Profile Details</Label>
                                        <Textarea
                                            id="profile-details"
                                            value={profileDetails}
                                            readOnly
                                            rows={8}
                                            className="bg-muted font-code text-xs"
                                        />
                                        <p className="text-xs text-muted-foreground">This is based on your current profile.</p>
                                    </div>
                                    <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                                        {loading ? 'Pulling threads to weave your network…' : 'Get Recommendations'}
                                    </Button>
                                </form>
                            )}
                        </CardContent>
                    </Card>

                    {loading && (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    )}
                    
                    {error && <p className="text-destructive text-center">{error}</p>}

                    {!loading && recommendations.length > 0 && (
                         <div className="space-y-4">
                            <h2 className="font-headline text-xl font-semibold">Here are your recommendations:</h2>
                            {recommendations.map((rec, index) => (
                                 <Card key={index} className="bg-card">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                                        <div className="flex-shrink-0">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                                <Bot className="h-6 w-6 text-primary" />
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-card-foreground">{rec}</p>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                 <Card className="flex flex-col h-[80vh] shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl flex items-center gap-2">
                            <Bot className="text-primary" />
                            StackBot
                        </CardTitle>
                        <CardDescription>
                            Your AI assistant for career advice, learning paths, and more.
                        </CardDescription>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {chatMessages.map((message, index) => (
                                <div key={index} className={cn('flex items-start gap-3', message.sender === 'user' ? 'justify-end' : '')}>
                                    {message.sender === 'bot' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback><Bot/></AvatarFallback>
                                        </Avatar>
                                    )}
                                     <div className={cn('max-w-md rounded-xl px-4 py-2', message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                        <p className="text-sm">{message.text}</p>
                                    </div>
                                    {message.sender === 'user' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback><User /></AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                            {chatLoading && <Skeleton className="h-12 w-1/2" />}
                            {chatError && <p className="text-destructive text-sm">{chatError}</p>}
                        </div>
                    </ScrollArea>
                     <CardContent className="pt-4 border-t">
                        <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Ask a question..."
                                disabled={chatLoading}
                            />
                            <Button type="submit" size="icon" disabled={chatLoading}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
