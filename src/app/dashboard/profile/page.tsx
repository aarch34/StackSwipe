
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserProfile } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const networkingGoalOptions = [
    'Hackathon Teammate',
    'Referrals',
    'Networking',
    'Looking for a Mentor / Mentee',
    'Looking for a Collaborator / Partner',
    'Looking to Hire / Get Hired',
    'Looking for Friends / Peers in my Field',
    'Looking to Learn or Teach Something',
    'Project / Startup Networking',
];

export default function ProfilePage() {
    const { profile: initialProfile, updateProfile, loading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (initialProfile) {
            setProfile({
                id: initialProfile.id || '',
                name: initialProfile.name ?? '',
                headline: initialProfile.headline ?? '',
                bio: initialProfile.bio ?? '',
                currentWork: initialProfile.currentWork ?? '',
                location: initialProfile.location ?? '',
                age: initialProfile.age ?? 18,
                gender: initialProfile.gender ?? '',
                experienceLevel: initialProfile.experienceLevel ?? '',
                company: initialProfile.company ?? '',
                college: initialProfile.college ?? '',
                photoURL: initialProfile.photoURL ?? '',
                techStack: initialProfile.techStack ?? [],
                interests: initialProfile.interests ?? [],
                networkingTags: initialProfile.networkingTags ?? [],
                links: {
                    github: initialProfile.links?.github ?? '',
                    linkedin: initialProfile.links?.linkedin ?? '',
                },
            });
        }
    }, [initialProfile]);

    if (loading || !profile) {
        return (
             <main className="container mx-auto p-4 md:p-8">
                 <Card className="max-w-3xl mx-auto">
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="flex justify-center">
                            <Skeleton className="h-32 w-32 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        </div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-20 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
                        <div className="flex justify-end"><Skeleton className="h-10 w-24" /></div>
                    </CardContent>
                 </Card>
             </main>
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfile(prev => prev ? ({ ...prev, [name]: name === 'age' ? parseInt(value, 10) : value }) : null);
    };

    const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProfile(prev => prev ? ({ ...prev, links: { ...prev.links, [name]: value } }) : null);
    };
    
    const handleArrayChange = (field: 'techStack' | 'interests', value: string) => {
        setProfile(prev => prev ? ({ ...prev, [field]: value.split(',').map(item => item.trim()) }) : null);
    };
    
    const handleNetworkingTagChange = (tag: string, checked: boolean) => {
        setProfile(prev => {
            if (!prev) return null;
            const currentTags = prev.networkingTags || [];
            const newTags = checked
                ? [...currentTags, tag]
                : currentTags.filter(t => t !== tag);
            return { ...prev, networkingTags: newTags };
        });
    };

    const handleSelectChange = (field: 'gender' | 'experienceLevel', value: string) => {
         setProfile(prev => prev ? ({ ...prev, [field]: value }) : null);
    }

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile(prev => prev ? { ...prev, photoURL: reader.result as string } : null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (profile) {
            try {
                await updateProfile(profile);
                toast({
                    title: 'Profile Updated',
                    description: 'Your profile has been saved successfully.',
                });
            } catch (error) {
                 toast({
                    title: 'Error updating profile',
                    description: 'Could not save your profile. Please try again.',
                    variant: 'destructive',
                });
            }
        }
    };

    return (
        <main className="container mx-auto p-4 md:p-8">
             <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Edit Your Profile</CardTitle>
                    <CardDescription>Keep your profile up-to-date to get the best matches.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="w-32 h-32">
                                <AvatarImage src={profile.photoURL} />
                                <AvatarFallback>
                                    <UserIcon className="w-16 h-16" />
                                </AvatarFallback>
                            </Avatar>
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="max-w-xs text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input id="name" name="name" value={profile.name} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="headline">Headline</Label>
                                <Input id="headline" name="headline" value={profile.headline} onChange={handleInputChange} />
                            </div>
                        </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="age">Age</Label>
                                <Input id="age" name="age" type="number" value={profile.age} onChange={handleInputChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gender</Label>
                                <Select value={profile.gender} onValueChange={(value) => handleSelectChange('gender', value)}>
                                    <SelectTrigger id="gender">
                                        <SelectValue placeholder="Select a gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="non-binary">Non-binary</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" name="location" value={profile.location} onChange={handleInputChange} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="bio">Bio</Label>
                            <Textarea id="bio" name="bio" value={profile.bio} onChange={handleInputChange} rows={4} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="currentWork">Current Work</Label>
                            <Input id="currentWork" name="currentWork" value={profile.currentWork} onChange={handleInputChange} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <Label htmlFor="experienceLevel">Experience Level</Label>
                                <Select value={profile.experienceLevel} onValueChange={(value) => handleSelectChange('experienceLevel', value as UserProfile['experienceLevel'])}>
                                    <SelectTrigger id="experienceLevel">
                                        <SelectValue placeholder="Select your experience level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Intern">Intern</SelectItem>
                                        <SelectItem value="Junior">Junior</SelectItem>
                                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                                        <SelectItem value="Senior">Senior</SelectItem>
                                        <SelectItem value="Lead">Lead</SelectItem>
                                        <SelectItem value="Manager">Manager</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="company">Company</Label>
                                <Input id="company" name="company" value={profile.company} onChange={handleInputChange} />
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="college">College</Label>
                            <Input id="college" name="college" value={profile.college} onChange={handleInputChange} />
                        </div>
                        
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="github">GitHub Profile URL</Label>
                                <Input id="github" name="github" value={profile.links.github} onChange={handleLinkChange} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                                <Input id="linkedin" name="linkedin" value={profile.links.linkedin} onChange={handleLinkChange} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="techStack">Tech Stack (comma-separated)</Label>
                            <Input 
                                id="techStack" 
                                name="techStack" 
                                value={profile.techStack.join(', ')} 
                                onChange={(e) => handleArrayChange('techStack', e.target.value)}
                            />
                             <div className="flex flex-wrap gap-2 pt-2">
                                {profile.techStack.filter(Boolean).map((skill) => (
                                    <Badge key={skill} variant="secondary">{skill}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="interests">Interests (comma-separated)</Label>
                            <Input 
                                id="interests" 
                                name="interests" 
                                value={profile.interests.join(', ')} 
                                onChange={(e) => handleArrayChange('interests', e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2 pt-2">
                                {profile.interests.filter(Boolean).map((interest) => (
                                    <Badge key={interest} variant="secondary">{interest}</Badge>
                               ))}
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Networking Goals</Label>
                             <div className="space-y-2 rounded-md border p-4">
                                {networkingGoalOptions.map((goal) => (
                                    <div key={goal} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`goal-${goal.replace(/\s/g, '-')}`}
                                            checked={profile.networkingTags.includes(goal)}
                                            onCheckedChange={(checked) => handleNetworkingTagChange(goal, !!checked)}
                                        />
                                        <label
                                            htmlFor={`goal-${goal.replace(/\s/g, '-')}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {goal}
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {profile.networkingTags.filter(Boolean).map((tag) => (
                                    <Badge key={tag} variant="outline">{tag}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </main>
    );

    