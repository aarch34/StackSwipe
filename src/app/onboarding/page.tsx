
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfile } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User as UserIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const profileStepSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  headline: z.string().min(5, { message: 'Headline must be at least 5 characters.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
  location: z.string().min(2, { message: 'Location must be at least 2 characters.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18.' }).max(99),
  gender: z.string().min(1, { message: 'Please select a gender.'}),
});

const pictureStepSchema = z.object({
    photoURL: z.string().optional(),
});

const workStepSchema = z.object({
  currentWork: z.string().min(5, { message: 'Current work must be at least 5 characters.' }),
  experienceLevel: z.enum(['Intern', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager']),
  company: z.string().optional(),
  college: z.string().optional(),
  techStack: z.string().min(2, { message: 'Please add at least one skill.' }),
  interests: z.string().min(2, { message: 'Please add at least one interest.' }),
});

const socialStepSchema = z.object({
    github: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
    linkedin: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

const networkingGoalOptions = [
    { id: 'hackathon-teammate', label: 'Hackathon Teammate' },
    { id: 'mentor-mentee', label: 'Looking for a Mentor / Mentee' },
    { id: 'collaborator-partner', label: 'Looking for a Collaborator / Partner' },
    { id: 'hire-get-hired', label: 'Looking to Hire / Get Hired' },
    { id: 'friends-peers', label: 'Looking for Friends / Peers in my Field' },
    { id: 'learn-teach', label: 'Looking to Learn or Teach Something' },
    { id: 'project-startup', label: 'Project / Startup Networking' },
];

const goalsStepSchema = z.object({
  networkingTags: z.array(z.string()).refine(value => value.some(item => item), {
    message: 'You have to select at least one item.',
  }),
});


const allSteps = [
    { id: 'Step 1', name: 'Profile Basics', fields: ['name', 'headline', 'bio', 'location', 'age', 'gender'], schema: profileStepSchema },
    { id: 'Step 2', name: 'Profile Picture', fields: ['photoURL'], schema: pictureStepSchema },
    { id: 'Step 3', name: 'Work & Skills', fields: ['currentWork', 'experienceLevel', 'company', 'college', 'techStack', 'interests'], schema: workStepSchema },
    { id: 'Step 4', name: 'Social Links', fields: ['github', 'linkedin'], schema: socialStepSchema },
    { id: 'Step 5', name: 'Networking Goals', fields: ['networkingTags'], schema: goalsStepSchema },
];


const fullSchema = profileStepSchema.merge(pictureStepSchema).merge(workStepSchema).merge(socialStepSchema).merge(goalsStepSchema);
type FormValues = z.infer<typeof fullSchema>;

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const router = useRouter();
    const { user, updateProfile } = useAuth();
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(fullSchema),
        defaultValues: {
            name: '',
            headline: '',
            bio: '',
            location: '',
            age: 18,
            gender: '',
            photoURL: '',
            currentWork: '',
            experienceLevel: 'Junior',
            company: '',
            college: '',
            techStack: '',
            interests: '',
            networkingTags: [],
            github: '',
            linkedin: '',
        },
    });

    const nextStep = async () => {
        const result = await form.trigger(allSteps[step].fields as (keyof FormValues)[]);
        if (result) {
            setStep((prev) => prev + 1);
        }
    };

    const prevStep = () => {
        setStep((prev) => prev - 1);
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                form.setValue('photoURL', reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        if (!user) {
            toast({
                title: 'Error',
                description: 'You must be logged in to create a profile.',
                variant: 'destructive',
            });
            return;
        }

        const newProfile: UserProfile = {
            id: user.uid,
            name: data.name,
            headline: data.headline,
            bio: data.bio,
            location: data.location,
            age: data.age,
            gender: data.gender,
            photoURL: data.photoURL,
            currentWork: data.currentWork,
            experienceLevel: data.experienceLevel,
            company: data.company || '',
            college: data.college || '',
            techStack: (data.techStack || '').split(',').map(item => item.trim()).filter(Boolean),
            interests: (data.interests || '').split(',').map(item => item.trim()).filter(Boolean),
            networkingTags: data.networkingTags.filter(Boolean),
            links: {
                github: data.github || '',
                linkedin: data.linkedin || '',
            },
        };
        
        try {
           await updateProfile(newProfile);
            toast({
                title: 'Profile Created!',
                description: "Welcome to StackSwipe! Let's find your next connection.",
            });
            router.push('/dashboard');
        } catch (error) {
             toast({
                title: 'Error creating profile',
                description: 'Could not save your profile. Please try again.',
                variant: 'destructive',
            });
             console.error("Profile creation error:", error);
        }
    };

    const progress = ((step + 1) / allSteps.length) * 100;
    const photoURL = form.watch('photoURL');

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <Progress value={progress} className="mb-4" />
                    <CardTitle className="font-headline text-2xl">Welcome to StackSwipe</CardTitle>
                    <CardDescription>
                        {allSteps[step].name}: Let's set up your profile to find the best connections.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {step === 0 && (
                                <>
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Name</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Ada Lovelace" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="age" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Age</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="gender" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Gender</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a gender" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="male">Male</SelectItem>
                                                        <SelectItem value="female">Female</SelectItem>
                                                        <SelectItem value="non-binary">Non-binary</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="headline" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Headline</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Senior Software Engineer @ DevCo" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="location" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Location</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., San Francisco, CA" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="bio" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bio</FormLabel>
                                            <FormControl><Textarea {...field} placeholder="Tell us a little about yourself..." rows={3} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </>
                            )}
                             {step === 1 && (
                                <FormField control={form.control} name="photoURL" render={({ field }) => (
                                    <FormItem className="flex flex-col items-center">
                                        <FormLabel>Profile Picture</FormLabel>
                                        <FormControl>
                                            <div>
                                                <Avatar className="w-32 h-32 mb-4">
                                                    <AvatarImage src={photoURL} />
                                                    <AvatarFallback>
                                                        <UserIcon className="w-16 h-16" />
                                                    </AvatarFallback>
                                                </Avatar>
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePhotoUpload}
                                                    className="max-w-xs"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>
                                            Upload a picture for your profile.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                             {step === 2 && (
                                <>
                                    <FormField control={form.control} name="currentWork" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Current Work</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Building a new design system." /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="experienceLevel" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Experience Level</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select your experience level" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Intern">Intern</SelectItem>
                                                    <SelectItem value="Junior">Junior</SelectItem>
                                                    <SelectItem value="Mid-level">Mid-level</SelectItem>
                                                    <SelectItem value="Senior">Senior</SelectItem>
                                                    <SelectItem value="Lead">Lead</SelectItem>
                                                    <SelectItem value="Manager">Manager</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="company" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company (optional)</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Google" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="college" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>College (optional)</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., University of California" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="techStack" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tech Stack (comma-separated)</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., React, TypeScript, Next.js" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="interests" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Interests (comma-separated)</FormLabel>
                                            <FormControl><Input {...field} placeholder="e.g., Design Systems, Web Accessibility" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </>
                            )}
                            {step === 3 && (
                                <>
                                    <FormField control={form.control} name="github" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>GitHub Profile</FormLabel>
                                            <FormControl><Input {...field} placeholder="https://github.com/your-username" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="linkedin" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>LinkedIn Profile</FormLabel>
                                            <FormControl><Input {...field} placeholder="https://linkedin.com/in/your-username" /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </>
                            )}
                             {step === 4 && (
                                <FormField
                                    control={form.control}
                                    name="networkingTags"
                                    render={() => (
                                        <FormItem>
                                            <div className="mb-4">
                                                <FormLabel className="text-base">Networking Goals</FormLabel>
                                                <FormDescription>
                                                    Select what you're looking for on StackSwipe.
                                                </FormDescription>
                                            </div>
                                            <div className="space-y-2">
                                            {networkingGoalOptions.map((item) => (
                                                <FormField
                                                    key={item.id}
                                                    control={form.control}
                                                    name="networkingTags"
                                                    render={({ field }) => {
                                                        return (
                                                            <FormItem
                                                                key={item.id}
                                                                className="flex flex-row items-start space-x-3 space-y-0"
                                                            >
                                                                <FormControl>
                                                                    <Checkbox
                                                                        checked={field.value?.includes(item.label)}
                                                                        onCheckedChange={(checked) => {
                                                                            return checked
                                                                                ? field.onChange([...(field.value || []), item.label])
                                                                                : field.onChange(
                                                                                    field.value?.filter(
                                                                                        (value) => value !== item.label
                                                                                    )
                                                                                )
                                                                        }}
                                                                    />
                                                                </FormControl>
                                                                <FormLabel className="font-normal">
                                                                    {item.label}
                                                                </FormLabel>
                                                            </FormItem>
                                                        )
                                                    }}
                                                />
                                            ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            <div className="flex justify-between pt-4">
                                {step > 0 ? (
                                    <Button type="button" variant="outline" onClick={prevStep}>
                                        Back
                                    </Button>
                                ) : <div />}
                                {step < allSteps.length - 1 ? (
                                    <Button type="button" onClick={nextStep}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button type="submit">Finish</Button>
                                )}
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );

    

    