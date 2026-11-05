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
import { User as UserIcon, Upload, Plus, X, Sparkles } from '@/components/px-icons';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadToCloudinary } from '@/lib/cloudinary'; // Add this import
import { TagPicker } from '@/components/tag-picker';
import { BlockedPeopleList } from '@/components/safety-actions';
import {
    CAN_HELP_OPTIONS,
    CONVERSATION_PREFERENCES,
    EXPERIENCE_LEVELS as PRESET_EXPERIENCE_LEVELS,
    GUIDANCE_OPTIONS,
    LEARNING_OPTIONS,
} from '@/lib/guidance';

const networkingGoalOptions = [
    'Hackathon Teammate',
    'Looking for a Collaborator / Partner',
    'Looking to Hire / Get Hired',
    'Looking for Friends / Peers in my Field',
    'Looking to Learn or Teach Something',
    'Project / Startup Networking',
];

export default function ProfilePage() {
    const { profile: initialProfile, updateProfile, loading } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [uploading, setUploading] = useState(false);
    const [isCustomExp, setIsCustomExp] = useState(false);
    const [customExpValue, setCustomExpValue] = useState('');
    const [customGoalInput, setCustomGoalInput] = useState('');
    const [isAddingCustomGoal, setIsAddingCustomGoal] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (initialProfile) {
            const exp = initialProfile.experienceLevel ?? '';
            if (exp && !PRESET_EXPERIENCE_LEVELS.some(p => p.value === exp)) {
                setIsCustomExp(true);
                setCustomExpValue(exp);
            }

            setProfile({
                id: initialProfile.id || '',
                name: initialProfile.name ?? '',
                headline: initialProfile.headline ?? '',
                bio: initialProfile.bio ?? '',
                currentWork: initialProfile.currentWork ?? '',
                jobTitle: initialProfile.jobTitle ?? '',
                industry: initialProfile.industry ?? '',
                canHelpWith: initialProfile.canHelpWith ?? [],
                currentlyLearning: initialProfile.currentlyLearning ?? [],
                guidanceWanted: initialProfile.guidanceWanted ?? [],
                conversationPreferences: initialProfile.conversationPreferences ?? [],
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
                onboarding_completed: initialProfile.onboarding_completed ?? true,
                onboarding_step: initialProfile.onboarding_step ?? 4,
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

    // REPLACE the old handlePhotoUpload with this Cloudinary version
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            
            // Upload to Cloudinary
            const imageUrl = await uploadToCloudinary(file);
            
            // Update profile with new image URL
            setProfile(prev => prev ? { ...prev, photoURL: imageUrl } : null);
            
            toast({
                title: 'Image uploaded successfully!',
                description: 'Your profile photo has been updated.',
            });
        } catch (error) {
            console.error('Upload failed:', error);
            toast({
                title: 'Upload failed',
                description: 'Could not upload your image. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
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
                    <CardTitle className="font-headline text-4xl leading-none">Your profile</CardTitle>
                    <CardDescription>You don&apos;t need to know everything to belong here.</CardDescription>
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
                            <div className="flex items-center gap-2">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="max-w-xs text-sm"
                                    disabled={uploading}
                                />
                                {uploading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Upload className="w-4 h-4 animate-spin" />
                                        Uploading...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rest of your form remains the same */}
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
                        
                        <section className="space-y-5 border-2 bg-muted p-4">
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">What I can help with</Label>
                                <p className="text-xs text-muted-foreground">Your experience could save someone else hours of figuring things out.</p>
                                <TagPicker
                                    options={CAN_HELP_OPTIONS}
                                    value={profile.canHelpWith ?? []}
                                    onChange={(canHelpWith) => setProfile(prev => prev ? { ...prev, canHelpWith } : null)}
                                    customPlaceholder="Add something else you could help with"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">What I&apos;m currently learning</Label>
                                <TagPicker
                                    options={LEARNING_OPTIONS}
                                    value={profile.currentlyLearning ?? []}
                                    onChange={(currentlyLearning) => setProfile(prev => prev ? { ...prev, currentlyLearning } : null)}
                                    customPlaceholder="Add something else you are learning"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">What I&apos;d love guidance on</Label>
                                <TagPicker
                                    options={GUIDANCE_OPTIONS}
                                    value={profile.guidanceWanted ?? []}
                                    onChange={(guidanceWanted) => setProfile(prev => prev ? { ...prev, guidanceWanted } : null)}
                                    customPlaceholder="Add something else you would like guidance on"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">I&apos;m up for</Label>
                                <TagPicker
                                    options={CONVERSATION_PREFERENCES}
                                    value={profile.conversationPreferences ?? []}
                                    onChange={(conversationPreferences) => setProfile(prev => prev ? { ...prev, conversationPreferences } : null)}
                                    allowCustom={false}
                                />
                            </div>
                        </section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="currentWork">Current role</Label>
                                <Input id="currentWork" name="currentWork" value={profile.currentWork} onChange={handleInputChange} placeholder="e.g., Student, Software Engineer" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industry">Industry</Label>
                                <Input id="industry" name="industry" value={profile.industry ?? ''} onChange={handleInputChange} placeholder="e.g., Fintech, Education" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="experienceLevel">Experience Level</Label>
                                    {isCustomExp && (
                                        <span className="text-[10px] text-primary font-medium">Custom Active</span>
                                    )}
                                </div>
                                <Select
                                    value={isCustomExp ? 'custom' : (PRESET_EXPERIENCE_LEVELS.some(p => p.value === profile.experienceLevel) ? profile.experienceLevel : 'custom')}
                                    onValueChange={(value) => {
                                        if (value === 'custom') {
                                            setIsCustomExp(true);
                                            const customVal = customExpValue.trim() || profile.experienceLevel || 'Custom';
                                            handleSelectChange('experienceLevel', customVal);
                                        } else {
                                            setIsCustomExp(false);
                                            setCustomExpValue('');
                                            handleSelectChange('experienceLevel', value);
                                        }
                                    }}
                                >
                                    <SelectTrigger id="experienceLevel">
                                        <SelectValue placeholder="Select your experience level">
                                            {isCustomExp
                                                ? (customExpValue || profile.experienceLevel ? `Custom: ${customExpValue || profile.experienceLevel}` : '✏️ Custom / Other...')
                                                : (PRESET_EXPERIENCE_LEVELS.find(p => p.value === profile.experienceLevel)?.label || profile.experienceLevel || 'Select your experience level')}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRESET_EXPERIENCE_LEVELS.map(level => (
                                            <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                        ))}
                                        <SelectItem value="custom" className="font-semibold text-primary">✏️ Custom / Other...</SelectItem>
                                    </SelectContent>
                                </Select>

                                {isCustomExp && (
                                    <div className="mt-2 space-y-1.5 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>Enter your custom role or experience:</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCustomExp(false);
                                                    setCustomExpValue('');
                                                    handleSelectChange('experienceLevel', 'Junior');
                                                }}
                                                className="text-[11px] text-primary hover:underline font-medium"
                                            >
                                                Choose from presets
                                            </button>
                                        </div>
                                        <Input
                                            placeholder="e.g., Founder & CTO, Solopreneur, Research Fellow, VP of Eng"
                                            value={customExpValue || (PRESET_EXPERIENCE_LEVELS.some(p => p.value === profile.experienceLevel) ? '' : profile.experienceLevel)}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setCustomExpValue(val);
                                                handleSelectChange('experienceLevel', val);
                                            }}
                                            className="h-9 text-sm"
                                            autoFocus
                                        />
                                    </div>
                                )}
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
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-semibold">Also up for</Label>
                                <span className="text-xs text-muted-foreground">Optional</span>
                            </div>

                            <div className="space-y-2 rounded-md border p-4 bg-card">
                                {/* Preset Goals */}
                                {networkingGoalOptions.map((goal) => (
                                    <div key={goal} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`goal-${goal.replace(/\s/g, '-')}`}
                                            checked={profile.networkingTags.includes(goal)}
                                            onCheckedChange={(checked) => handleNetworkingTagChange(goal, !!checked)}
                                        />
                                        <label
                                            htmlFor={`goal-${goal.replace(/\s/g, '-')}`}
                                            className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1 py-1"
                                        >
                                            {goal}
                                        </label>
                                    </div>
                                ))}

                                {/* Custom Goals */}
                                {profile.networkingTags.filter(t => !networkingGoalOptions.includes(t)).map((customGoal) => (
                                    <div key={customGoal} className="flex items-center space-x-2 p-1.5 rounded-md bg-primary/5 border border-primary/20">
                                        <Checkbox
                                            id={`custom-goal-${customGoal}`}
                                            checked={profile.networkingTags.includes(customGoal)}
                                            onCheckedChange={(checked) => handleNetworkingTagChange(customGoal, !!checked)}
                                        />
                                        <label
                                            htmlFor={`custom-goal-${customGoal}`}
                                            className="text-sm font-medium leading-none cursor-pointer flex-1 flex items-center justify-between py-1"
                                        >
                                            <span>{customGoal}</span>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                                                    Custom
                                                </Badge>
                                                <button
                                                    type="button"
                                                    title="Remove custom goal"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleNetworkingTagChange(customGoal, false);
                                                    }}
                                                    className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </label>
                                    </div>
                                ))}

                                {/* Add Custom Goal Section */}
                                {!isAddingCustomGoal ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsAddingCustomGoal(true)}
                                        className="flex items-center space-x-2 text-xs font-semibold text-primary hover:text-primary/80 pt-2 px-1 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>✏️ Other / Custom Goal...</span>
                                    </button>
                                ) : (
                                    <div className="pt-2 space-y-2 border-t border-border/50 animate-in fade-in duration-150">
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="font-medium text-foreground flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-primary" /> Enter custom goal:
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingCustomGoal(false);
                                                    setCustomGoalInput('');
                                                }}
                                                className="hover:text-foreground text-[11px]"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="e.g., Looking for Co-Founder, Hackathon Team"
                                                value={customGoalInput}
                                                onChange={(e) => setCustomGoalInput(e.target.value)}
                                                className="h-9 text-xs"
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const trimmed = customGoalInput.trim();
                                                        if (trimmed && !profile.networkingTags.includes(trimmed)) {
                                                            handleNetworkingTagChange(trimmed, true);
                                                            setCustomGoalInput('');
                                                            setIsAddingCustomGoal(false);
                                                        }
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="h-9 px-3 text-xs shrink-0"
                                                disabled={!customGoalInput.trim()}
                                                onClick={() => {
                                                    const trimmed = customGoalInput.trim();
                                                    if (trimmed && !profile.networkingTags.includes(trimmed)) {
                                                        handleNetworkingTagChange(trimmed, true);
                                                        setCustomGoalInput('');
                                                        setIsAddingCustomGoal(false);
                                                    }
                                                }}
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {profile.networkingTags.filter(Boolean).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                        {!networkingGoalOptions.includes(tag) && (
                                            <span className="ml-1 text-[9px] text-primary">(custom)</span>
                                        )}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                    <div className="mt-6">
                        <BlockedPeopleList />
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
