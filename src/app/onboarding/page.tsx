'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { UserProfile } from '@/lib/data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User as UserIcon,
  LogOut,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  BookmarkCheck,
  Plus,
  X,
} from '@/components/px-icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { uploadToCloudinary } from '@/lib/cloudinary';

const profileStepSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  headline: z.string().min(5, { message: 'Headline must be at least 5 characters.' }),
  bio: z.string().min(10, { message: 'Bio must be at least 10 characters.' }),
  location: z.string().min(2, { message: 'Location must be at least 2 characters.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18.' }).max(99),
  gender: z.string().min(1, { message: 'Please select a gender.' }),
});

const pictureStepSchema = z.object({
  photoURL: z.string().optional(),
});

const workStepSchema = z.object({
  currentWork: z.string().min(5, { message: 'Current work must be at least 5 characters.' }),
  experienceLevel: z.string().min(1, { message: 'Please select or enter your experience level.' }),
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
  networkingTags: z.array(z.string()).refine((value) => value.some((item) => Boolean(item)), {
    message: 'You have to select at least one networking goal.',
  }),
});

const allSteps = [
  {
    id: 'Step 1',
    name: 'Profile Basics',
    description: 'Introduce yourself to the tech community',
    fields: ['name', 'age', 'gender', 'headline', 'location', 'bio'] as const,
    schema: profileStepSchema,
  },
  {
    id: 'Step 2',
    name: 'Profile Picture',
    description: 'Add a face to your profile',
    fields: ['photoURL'] as const,
    schema: pictureStepSchema,
  },
  {
    id: 'Step 3',
    name: 'Work & Skills',
    description: 'Share what you build and what you know',
    fields: ['currentWork', 'experienceLevel', 'company', 'college', 'techStack', 'interests'] as const,
    schema: workStepSchema,
  },
  {
    id: 'Step 4',
    name: 'Social Links',
    description: 'Connect your developer footprint',
    fields: ['github', 'linkedin'] as const,
    schema: socialStepSchema,
  },
  {
    id: 'Step 5',
    name: 'Networking Goals',
    description: 'Tell us who you want to meet',
    fields: ['networkingTags'] as const,
    schema: goalsStepSchema,
  },
];

export const PRESET_EXPERIENCE_LEVELS = [
  { value: 'Intern', label: 'Intern' },
  { value: 'Junior', label: 'Junior (0-2 yrs)' },
  { value: 'Mid-level', label: 'Mid-level (2-5 yrs)' },
  { value: 'Senior', label: 'Senior (5-8 yrs)' },
  { value: 'Lead', label: 'Lead / Staff (8+ yrs)' },
  { value: 'Manager', label: 'Engineering Manager' },
  { value: 'Founder', label: 'Founder / Co-Founder' },
  { value: 'Freelancer', label: 'Freelancer / Consultant' },
  { value: 'Student', label: 'Student / Self-Taught' },
];

const fullSchema = profileStepSchema
  .merge(pictureStepSchema)
  .merge(workStepSchema)
  .merge(socialStepSchema)
  .merge(goalsStepSchema);

type FormValues = z.infer<typeof fullSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    profile,
    onboardingStep: savedAuthStep,
    saveOnboardingProgress,
    updateProfile,
    logout,
  } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [resumedStep, setResumedStep] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCustomExp, setIsCustomExp] = useState(false);
  const [customExpValue, setCustomExpValue] = useState('');
  const [isCustomGender, setIsCustomGender] = useState(false);
  const [customGenderValue, setCustomGenderValue] = useState('');
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [extraGoals, setExtraGoals] = useState<string[]>([]);
  const [isAddingCustomGoal, setIsAddingCustomGoal] = useState(false);

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

  // Restore onboarding step & draft values from Supabase profile or localStorage
  useEffect(() => {
    if (!user || initialized) return;

    let initialStep = 0;
    let initialValues: Partial<FormValues> = {};

    // 1. Read from localStorage draft cache
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(`stackswipe_onboarding_draft_${user.id}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < allSteps.length) {
            initialStep = parsed.step;
          }
          if (parsed.data) {
            const d = parsed.data;
            initialValues = {
              name: d.name || '',
              headline: d.headline || '',
              bio: d.bio || '',
              location: d.location || '',
              age: d.age || 18,
              gender: d.gender || '',
              photoURL: d.photoURL || '',
              currentWork: d.currentWork || '',
              experienceLevel: d.experienceLevel || 'Junior',
              company: d.company || '',
              college: d.college || '',
              techStack: Array.isArray(d.techStack) ? d.techStack.join(', ') : (d.techStack || ''),
              interests: Array.isArray(d.interests) ? d.interests.join(', ') : (d.interests || ''),
              networkingTags: Array.isArray(d.networkingTags) ? d.networkingTags : [],
              github: d.links?.github || '',
              linkedin: d.links?.linkedin || '',
            };
          }
        }
      } catch (err) {
        console.warn('Error reading onboarding draft:', err);
      }
    }

    // 2. Override with remote profile data if available
    if (profile) {
      if (typeof profile.onboarding_step === 'number' && profile.onboarding_step >= 0 && profile.onboarding_step < allSteps.length) {
        initialStep = Math.max(initialStep, profile.onboarding_step);
      }
      initialValues = {
        name: profile.name || initialValues.name || '',
        headline: profile.headline || initialValues.headline || '',
        bio: profile.bio || initialValues.bio || '',
        location: profile.location || initialValues.location || '',
        age: profile.age || initialValues.age || 18,
        gender: profile.gender || initialValues.gender || '',
        photoURL: profile.photoURL || initialValues.photoURL || '',
        currentWork: profile.currentWork || initialValues.currentWork || '',
        experienceLevel: (profile.experienceLevel as any) || initialValues.experienceLevel || 'Junior',
        company: profile.company || initialValues.company || '',
        college: profile.college || initialValues.college || '',
        techStack: profile.techStack?.length ? profile.techStack.join(', ') : (initialValues.techStack || ''),
        interests: profile.interests?.length ? profile.interests.join(', ') : (initialValues.interests || ''),
        networkingTags: profile.networkingTags?.length ? profile.networkingTags : (initialValues.networkingTags || []),
        github: profile.links?.github || initialValues.github || '',
        linkedin: profile.links?.linkedin || initialValues.linkedin || '',
      };
    } else if (typeof savedAuthStep === 'number' && savedAuthStep >= 0 && savedAuthStep < allSteps.length) {
      initialStep = Math.max(initialStep, savedAuthStep);
    }

    // 3. Fallback to auth metadata
    if (!initialValues.name && user.displayName) {
      initialValues.name = user.displayName;
    }
    if (!initialValues.photoURL && user.photoURL) {
      initialValues.photoURL = user.photoURL;
    }

    // Apply values to form
    form.reset({
      name: initialValues.name || '',
      headline: initialValues.headline || '',
      bio: initialValues.bio || '',
      location: initialValues.location || '',
      age: initialValues.age || 18,
      gender: initialValues.gender || '',
      photoURL: initialValues.photoURL || '',
      currentWork: initialValues.currentWork || '',
      experienceLevel: initialValues.experienceLevel || 'Junior',
      company: initialValues.company || '',
      college: initialValues.college || '',
      techStack: initialValues.techStack || '',
      interests: initialValues.interests || '',
      networkingTags: initialValues.networkingTags || [],
      github: initialValues.github || '',
      linkedin: initialValues.linkedin || '',
    });

    if (initialStep > 0) {
      setResumedStep(initialStep);
    }

    const restoredExp = initialValues.experienceLevel || 'Junior';
    if (restoredExp && !PRESET_EXPERIENCE_LEVELS.some((p) => p.value === restoredExp)) {
      setIsCustomExp(true);
      setCustomExpValue(restoredExp);
    }
    const restoredGender = initialValues.gender || '';
    if (restoredGender && !['male', 'female', 'non-binary', 'prefer-not-to-say'].includes(restoredGender.toLowerCase())) {
      setIsCustomGender(true);
      setCustomGenderValue(restoredGender);
    }
    const restoredTags = (initialValues.networkingTags || []) as string[];
    const knownLabels = new Set(networkingGoalOptions.map((o) => o.label));
    const customGoals = restoredTags.filter((t) => !knownLabels.has(t));
    if (customGoals.length > 0) {
      setExtraGoals(customGoals);
    }

    setStep(initialStep);
    setInitialized(true);
  }, [user, profile, savedAuthStep, initialized, form]);

  // Construct partial profile data from current form state
  const getCurrentProfileSnapshot = (stepIndex: number): Partial<UserProfile> => {
    const data = form.getValues();
    return {
      name: data.name || '',
      headline: data.headline || '',
      bio: data.bio || '',
      location: data.location || '',
      age: data.age || 18,
      gender: data.gender || '',
      photoURL: data.photoURL || '',
      currentWork: data.currentWork || '',
      experienceLevel: data.experienceLevel || 'Junior',
      company: data.company || '',
      college: data.college || '',
      techStack: (data.techStack || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      interests: (data.interests || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      networkingTags: (data.networkingTags || []).filter(Boolean),
      links: {
        github: data.github || '',
        linkedin: data.linkedin || '',
      },
      onboarding_completed: false,
      onboarding_step: stepIndex,
    };
  };

  const nextStep = async () => {
    const currentFields = allSteps[step].fields as readonly (keyof FormValues)[];
    const isValid = await form.trigger(currentFields as (keyof FormValues)[]);

    if (!isValid) return;

    const nextStepIndex = Math.min(step + 1, allSteps.length - 1);
    
    // 1. Immediately advance to the next step (instant, snappy UI)
    setStep(nextStepIndex);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 2. Persist draft immediately to localStorage for instant resume on refresh
    if (user && typeof window !== 'undefined') {
      try {
        const partialData = getCurrentProfileSnapshot(nextStepIndex);
        localStorage.setItem(
          `stackswipe_onboarding_draft_${user.id}`,
          JSON.stringify({
            step: nextStepIndex,
            data: partialData,
          })
        );
      } catch (err) {
        console.warn('Could not save draft locally:', err);
      }
    }

    // 3. Sync to Supabase in the background without blocking the UI
    if (user) {
      const partialData = getCurrentProfileSnapshot(nextStepIndex);
      saveOnboardingProgress(nextStepIndex, partialData).catch((err) => {
        console.warn('Background step progress sync notice:', err);
      });
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  // Safe exit option: preserves all inputs and signs out
  const handleSaveAndSignOut = async () => {
    setIsSaving(true);
    try {
      const partialData = getCurrentProfileSnapshot(step);
      await saveOnboardingProgress(step, partialData);
      toast({
        title: 'Progress Saved',
        description: 'You can resume your onboarding next time you log in.',
      });
      await logout();
    } catch (err) {
      console.error('Error saving progress on logout:', err);
      await logout();
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      // Try Cloudinary if keys are present
      if (
        process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
      ) {
        try {
          const url = await uploadToCloudinary(file);
          if (url) {
            form.setValue('photoURL', url);
            setIsUploadingPhoto(false);
            return;
          }
        } catch (cloudErr) {
          console.warn('Cloudinary upload fallback to reader:', cloudErr);
        }
      }

      // Fallback to FileReader data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('photoURL', reader.result as string);
        setIsUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Photo upload error:', err);
      setIsUploadingPhoto(false);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete onboarding.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const userId = user.id || (user as any).uid || '';
    const newProfile: UserProfile = {
      id: userId,
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
      techStack: (data.techStack || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      interests: (data.interests || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      networkingTags: (data.networkingTags || []).filter(Boolean),
      links: {
        github: data.github || '',
        linkedin: data.linkedin || '',
      },
      onboarding_completed: true,
      onboarding_step: 4,
    };

    try {
      // 1. Immediately mark onboarding completed in localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`stackswipe_onboarding_draft_${userId}`);
        localStorage.setItem(
          `stackswipe_onboarding_${userId}`,
          JSON.stringify({
            onboarding_completed: true,
            onboarding_step: 4,
          })
        );
        localStorage.setItem('stackswipe_cached_profile', JSON.stringify(newProfile));
      }

      // 2. Update profile state and save to Supabase
      await updateProfile(newProfile);

      toast({
        title: '🎉 Welcome to StackSwipe!',
        description: 'Your profile has been saved. Connecting you to the community now…',
      });

      // 3. Navigate immediately to dashboard with hard fallback
      router.replace('/dashboard');
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/onboarding')) {
          window.location.href = '/dashboard';
        }
      }, 350);
    } catch (error) {
      console.warn('Profile completion proceeding with cached profile:', error);
      toast({
        title: '🎉 Welcome to StackSwipe!',
        description: 'Connecting you to the community now…',
      });
      router.replace('/dashboard');
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname.includes('/onboarding')) {
          window.location.href = '/dashboard';
        }
      }, 350);
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / allSteps.length) * 100;
  const photoURL = form.watch('photoURL');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-muted/20 to-background p-4 sm:p-6">
      <Card className="w-full max-w-xl shadow-2xl border-border/70 backdrop-blur-md bg-card/95">
        <CardHeader className="space-y-3 pb-4">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Step {step + 1} of {allSteps.length}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveAndSignOut}
              disabled={isSaving || isSubmitting}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Save & Exit
            </Button>
          </div>

          <Progress value={progress} className="h-2 rounded-full" />

          {/* Stepper Dots */}
          <div className="flex justify-between items-center pt-1 px-1">
            {allSteps.map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                    idx < step
                      ? 'bg-primary text-primary-foreground'
                      : idx === step
                      ? 'bg-primary/20 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className="hidden sm:inline text-[10px] mt-1 text-muted-foreground font-medium truncate max-w-[70px]">
                  {s.name}
                </span>
              </div>
            ))}
          </div>

          {/* Resume notification banner */}
          {resumedStep !== null && (
            <div className="rounded-lg bg-primary/10 border border-primary/25 px-3 py-2 flex items-center justify-between text-xs text-primary mt-2">
              <span className="flex items-center gap-1.5 font-medium">
                <BookmarkCheck className="h-4 w-4" />
                Resumed from your previously saved progress (Step {resumedStep + 1})
              </span>
              <Badge variant="outline" className="border-primary/40 text-[10px] px-1.5 py-0">
                Auto-saved
              </Badge>
            </div>
          )}

          <div>
            <CardTitle className="font-headline text-2xl font-bold tracking-tight">
              {allSteps[step].name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              {allSteps[step].description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* STEP 1: PROFILE BASICS */}
              {step === 0 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Alex Johnson" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age</FormLabel>
                          <FormControl>
                            <Input type="number" min={18} max={99} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => {
                        const standardGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
                        const isOther = isCustomGender || (!standardGenders.includes(field.value?.toLowerCase() || '') && !!field.value);

                        return (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                              value={isOther ? 'other' : field.value}
                              onValueChange={(val) => {
                                if (val === 'other') {
                                  setIsCustomGender(true);
                                  field.onChange(customGenderValue.trim() || 'Other');
                                } else {
                                  setIsCustomGender(false);
                                  setCustomGenderValue('');
                                  field.onChange(val);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="non-binary">Non-binary</SelectItem>
                                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                <SelectItem value="other">Other / Custom</SelectItem>
                              </SelectContent>
                            </Select>
                            {isOther && (
                              <div className="mt-2 animate-in fade-in duration-200">
                                <Input
                                  placeholder="Specify gender (optional)"
                                  value={customGenderValue || (standardGenders.includes(field.value || '') ? '' : field.value)}
                                  onChange={(e) => {
                                    setCustomGenderValue(e.target.value);
                                    field.onChange(e.target.value);
                                  }}
                                  className="h-9 text-xs"
                                />
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Headline</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Full Stack Engineer building Next.js apps" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          A punchy one-liner displayed on your match card.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., San Francisco, CA or Remote" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Share your journey, current projects, and what excites you in tech..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* STEP 2: PROFILE PICTURE */}
              {step === 1 && (
                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center py-4">
                      <FormLabel className="text-base font-semibold mb-3">Profile Photo</FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <Avatar className="w-32 h-32 border-4 border-primary/20 shadow-lg">
                            <AvatarImage src={photoURL || field.value} alt="Profile photo" />
                            <AvatarFallback className="bg-muted">
                              <UserIcon className="w-16 h-16 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              disabled={isUploadingPhoto}
                              className="max-w-xs text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                            {isUploadingPhoto && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                Processing image…
                              </p>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription className="text-xs text-center mt-3 max-w-sm">
                        You can upload a photo now or add one later in your profile settings.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* STEP 3: WORK & SKILLS */}
              {step === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentWork"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Role / Project</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Software Engineer @ Startup or Open Source Builder" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experienceLevel"
                    render={({ field }) => {
                      const isPreset = PRESET_EXPERIENCE_LEVELS.some((p) => p.value === field.value);
                      const currentSelectValue = isCustomExp ? 'custom' : (isPreset ? field.value : 'custom');

                      return (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Experience Level</FormLabel>
                            {isCustomExp && (
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-medium">
                                Custom Option
                              </Badge>
                            )}
                          </div>
                          <Select
                            value={currentSelectValue}
                            onValueChange={(val) => {
                              if (val === 'custom') {
                                setIsCustomExp(true);
                                const customVal = customExpValue.trim() || 'Custom';
                                field.onChange(customVal);
                              } else {
                                setIsCustomExp(false);
                                setCustomExpValue('');
                                field.onChange(val);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select experience level">
                                  {isCustomExp
                                    ? (customExpValue || field.value ? `Custom: ${customExpValue || field.value}` : '✏️ Custom / Other...')
                                    : (PRESET_EXPERIENCE_LEVELS.find((p) => p.value === field.value)?.label || field.value || 'Select experience level')}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PRESET_EXPERIENCE_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom" className="font-semibold text-primary">
                                ✏️ Custom / Other...
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {/* Dynamic Custom Experience Input */}
                          {isCustomExp && (
                            <div className="mt-2.5 p-3 rounded-lg border border-primary/20 bg-muted/40 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="custom-experience" className="text-xs font-medium text-foreground">
                                  Enter your custom role or experience level:
                                </Label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCustomExp(false);
                                    setCustomExpValue('');
                                    field.onChange('Junior');
                                  }}
                                  className="text-[11px] text-primary hover:underline font-medium"
                                >
                                  Choose from presets
                                </button>
                              </div>
                              <Input
                                id="custom-experience"
                                placeholder="e.g., Founder & CTO, Solopreneur, Tech Lead Manager, Research Fellow"
                                value={customExpValue || (isPreset ? '' : field.value)}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCustomExpValue(val);
                                  field.onChange(val);
                                }}
                                className="bg-background text-sm h-10"
                                autoFocus
                              />
                              <p className="text-[11px] text-muted-foreground">
                                This title will be shown on your discovery card and profile for other tech peers to see.
                              </p>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Stripe, Vercel" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="college"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>College / University (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Stanford University" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tech Stack (comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., React, TypeScript, Python, Next.js, PostgreSQL" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Used to match you with developers working with complementary tools.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interests (comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., AI Agents, Distributed Systems, Web3, UI/UX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* STEP 4: SOCIAL LINKS */}
              {step === 3 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="github"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub Profile URL (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://github.com/your-username" />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Allows potential collaborators to view your repositories.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn Profile URL (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/in/your-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* STEP 5: NETWORKING GOALS */}
              {step === 4 && (
                <FormField
                  control={form.control}
                  name="networkingTags"
                  render={({ field }) => {
                    const selectedTags = field.value || [];
                    const presetLabels = new Set(networkingGoalOptions.map((o) => o.label));
                    // Union of extraGoals and any custom tags in selectedTags
                    const allCustomGoals = Array.from(
                      new Set([...extraGoals, ...selectedTags.filter((t) => !presetLabels.has(t))])
                    );

                    const toggleGoal = (goalLabel: string, checked: boolean) => {
                      if (checked) {
                        field.onChange([...selectedTags, goalLabel]);
                      } else {
                        field.onChange(selectedTags.filter((t) => t !== goalLabel));
                      }
                    };

                    const handleAddCustomGoal = () => {
                      const trimmed = customGoalInput.trim();
                      if (!trimmed) return;
                      if (!allCustomGoals.includes(trimmed)) {
                        setExtraGoals((prev) => [...prev, trimmed]);
                      }
                      if (!selectedTags.includes(trimmed)) {
                        field.onChange([...selectedTags, trimmed]);
                      }
                      setCustomGoalInput('');
                      setIsAddingCustomGoal(false);
                    };

                    const handleRemoveCustomGoal = (goalLabel: string) => {
                      setExtraGoals((prev) => prev.filter((g) => g !== goalLabel));
                      field.onChange(selectedTags.filter((t) => t !== goalLabel));
                    };

                    return (
                      <FormItem className="space-y-3">
                        <div>
                          <FormLabel className="text-base font-semibold">What are you looking for?</FormLabel>
                          <FormDescription className="text-xs mt-1">
                            Select one or more goals to tailor your StackSwipe feed.
                          </FormDescription>
                        </div>

                        <div className="space-y-2 pt-1">
                          {/* 1. PRESET NETWORKING GOALS */}
                          {networkingGoalOptions.map((item) => {
                            const isChecked = selectedTags.includes(item.label);
                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleGoal(item.label, !isChecked)}
                                className={`flex flex-row items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'border-primary/50 bg-primary/5 text-foreground'
                                    : 'border-border/60 hover:bg-muted/40 text-foreground'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => toggleGoal(item.label, !!checked)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="font-normal text-sm select-none flex-1">
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}

                          {/* 2. CUSTOM NETWORKING GOALS ALREADY ADDED */}
                          {allCustomGoals.map((customTag) => {
                            const isChecked = selectedTags.includes(customTag);
                            return (
                              <div
                                key={customTag}
                                onClick={() => toggleGoal(customTag, !isChecked)}
                                className={`flex flex-row items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'border-primary/50 bg-primary/10 text-foreground'
                                    : 'border-border/60 bg-muted/20 text-muted-foreground'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) => toggleGoal(customTag, !!checked)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <span className="font-medium text-sm select-none flex-1 truncate">
                                  {customTag}
                                </span>
                                <Badge variant="outline" className="text-[10px] text-primary border-primary/30 shrink-0">
                                  Custom
                                </Badge>
                                <button
                                  type="button"
                                  title="Delete custom goal"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveCustomGoal(customTag);
                                  }}
                                  className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}

                          {/* 3. INLINE "OTHER / CUSTOM GOAL..." INTERACTIVE OPTION */}
                          {!isAddingCustomGoal ? (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => setIsAddingCustomGoal(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setIsAddingCustomGoal(true);
                                }
                              }}
                              className="flex flex-row items-center space-x-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 hover:bg-primary/10 hover:border-primary/70 transition-all cursor-pointer group"
                            >
                              <div className="w-4 h-4 rounded border border-primary/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <Plus className="w-3 h-3" />
                              </div>
                              <span className="text-sm font-medium text-primary flex-1">
                                ✏️ Other / Custom Goal...
                              </span>
                              <Badge variant="secondary" className="text-[10px] font-normal text-muted-foreground">
                                Click to add
                              </Badge>
                            </div>
                          ) : (
                            <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-3.5 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="custom-goal-input" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                                  Enter your custom networking objective:
                                </Label>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsAddingCustomGoal(false);
                                    setCustomGoalInput('');
                                  }}
                                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  id="custom-goal-input"
                                  autoFocus
                                  placeholder="e.g., Seeking Co-Founder, Angel Investors, Hackathon Team"
                                  value={customGoalInput}
                                  onChange={(e) => setCustomGoalInput(e.target.value)}
                                  className="text-sm h-9 bg-background"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCustomGoal();
                                    } else if (e.key === 'Escape') {
                                      setIsAddingCustomGoal(false);
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-9 px-3 shrink-0 font-medium"
                                  disabled={!customGoalInput.trim()}
                                  onClick={handleAddCustomGoal}
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" />
                                  Add Goal
                                </Button>
                              </div>
                              <p className="text-[11px] text-muted-foreground">
                                Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> to add. You can add as many custom goals as you need!
                              </p>
                            </div>
                          )}
                        </div>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              {/* NAVIGATION ACTIONS */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                {step > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={isSaving || isSubmitting}
                    className="flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < allSteps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={isSaving || isSubmitting}
                    className="flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting || isSaving}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground font-semibold px-6"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finishing Setup…
                      </>
                    ) : (
                      <>
                        Finish & Enter Dashboard
                        <Sparkles className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}