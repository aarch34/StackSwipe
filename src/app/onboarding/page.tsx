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
import { Stacky } from '@/components/pixel/sprites';
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
} from '@/components/px-icons';
import { Badge } from '@/components/ui/badge';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { TagPicker } from '@/components/tag-picker';
import { CommunityPrinciplesList } from '@/components/community-principles';
import {
  CAN_HELP_OPTIONS,
  CONVERSATION_PREFERENCES,
  EXPERIENCE_LEVELS,
  GUIDANCE_OPTIONS,
  LEARNING_OPTIONS,
} from '@/lib/guidance';

const optionalText = z.string().optional().or(z.literal(''));
const DEFAULT_EXPERIENCE = 'Just getting started';
const FINAL_STEP_INDEX = 5;

const profileStepSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  location: z.string().min(2, { message: 'Location must be at least 2 characters.' }),
  age: z.coerce.number().min(18, { message: 'You must be at least 18.' }).max(99),
  gender: optionalText,
  headline: optionalText,
  bio: optionalText,
});

const pictureStepSchema = z.object({
  photoURL: z.string().optional(),
});

const workStepSchema = z.object({
  currentWork: optionalText,
  experienceLevel: z.string().min(1, { message: 'Please pick the one closest to you.' }),
  company: optionalText,
  college: optionalText,
  industry: optionalText,
  techStack: optionalText,
  interests: optionalText,
});

const shareStepSchema = z.object({
  canHelpWith: z.array(z.string()),
  currentlyLearning: z.array(z.string()),
  guidanceWanted: z.array(z.string()),
});

const socialStepSchema = z.object({
  github: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  linkedin: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
});

const conversationStepSchema = z.object({
  conversationPreferences: z.array(z.string()),
});

const allSteps = [
  {
    id: 'about',
    name: 'About you',
    description: 'Just the basics, so people know who they are talking to.',
    fields: ['name', 'age', 'location', 'gender', 'headline', 'bio'] as const,
  },
  {
    id: 'photo',
    name: 'Your photo',
    description: 'Optional, but a friendly face makes it easier to say hello.',
    fields: ['photoURL'] as const,
  },
  {
    id: 'now',
    name: 'Where you are now',
    description: 'No impressive job title needed. You do not need to know everything to belong here.',
    fields: ['currentWork', 'experienceLevel', 'company', 'college', 'industry', 'techStack', 'interests'] as const,
  },
  {
    id: 'share',
    name: 'Share and learn',
    description: 'Everyone has something to teach and something to learn. Pick anything that fits, or skip for now.',
    fields: ['canHelpWith', 'currentlyLearning', 'guidanceWanted'] as const,
  },
  {
    id: 'links',
    name: 'Your links',
    description: 'Totally optional. Add them if you would like people to see your work.',
    fields: ['github', 'linkedin'] as const,
  },
  {
    id: 'conversations',
    name: 'Your kind of conversation',
    description: 'Let people know what you are up for. You can change this whenever you like.',
    fields: ['conversationPreferences'] as const,
  },
];

const fullSchema = profileStepSchema
  .merge(pictureStepSchema)
  .merge(workStepSchema)
  .merge(shareStepSchema)
  .merge(socialStepSchema)
  .merge(conversationStepSchema);

type FormValues = z.infer<typeof fullSchema>;

const STANDARD_GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];

const splitList = (value?: string) =>
  (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

function valuesFromProfile(source: Partial<UserProfile> | null | undefined): Partial<FormValues> {
  if (!source) return {};
  return {
    name: source.name || undefined,
    headline: source.headline || undefined,
    bio: source.bio || undefined,
    location: source.location || undefined,
    age: source.age || undefined,
    gender: source.gender || undefined,
    photoURL: source.photoURL || undefined,
    currentWork: source.currentWork || undefined,
    experienceLevel: source.experienceLevel || undefined,
    company: source.company || undefined,
    college: source.college || undefined,
    industry: source.industry || undefined,
    techStack: source.techStack?.length ? source.techStack.join(', ') : undefined,
    interests: source.interests?.length ? source.interests.join(', ') : undefined,
    canHelpWith: source.canHelpWith?.length ? source.canHelpWith : undefined,
    currentlyLearning: source.currentlyLearning?.length ? source.currentlyLearning : undefined,
    guidanceWanted: source.guidanceWanted?.length ? source.guidanceWanted : undefined,
    conversationPreferences: source.conversationPreferences?.length ? source.conversationPreferences : undefined,
    github: source.links?.github || undefined,
    linkedin: source.links?.linkedin || undefined,
  };
}

const withoutUndefined = <T extends object>(values: T): Partial<T> =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;

const EMPTY_VALUES: FormValues = {
  name: '',
  headline: '',
  bio: '',
  location: '',
  age: 18,
  gender: '',
  photoURL: '',
  currentWork: '',
  experienceLevel: DEFAULT_EXPERIENCE,
  company: '',
  college: '',
  industry: '',
  techStack: '',
  interests: '',
  canHelpWith: [],
  currentlyLearning: [],
  guidanceWanted: [],
  conversationPreferences: [],
  github: '',
  linkedin: '',
};

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
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [resumedStep, setResumedStep] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCustomExp, setIsCustomExp] = useState(false);
  const [customExpValue, setCustomExpValue] = useState('');
  const [isCustomGender, setIsCustomGender] = useState(false);
  const [customGenderValue, setCustomGenderValue] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(fullSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Restore onboarding step and draft values from the Supabase profile or localStorage
  useEffect(() => {
    if (!user || initialized) return;

    const validStep = (value: unknown): value is number =>
      typeof value === 'number' && value >= 0 && value < allSteps.length;

    let initialStep = 0;
    let draftValues: Partial<FormValues> = {};

    try {
      const raw = localStorage.getItem(`stackswipe_onboarding_draft_${user.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (validStep(parsed.step)) initialStep = parsed.step;
        draftValues = valuesFromProfile(parsed.data);
      }
    } catch (err) {
      console.warn('Error reading onboarding draft:', err);
    }

    if (profile) {
      if (validStep(profile.onboarding_step)) initialStep = Math.max(initialStep, profile.onboarding_step);
    } else if (validStep(savedAuthStep)) {
      initialStep = Math.max(initialStep, savedAuthStep);
    }

    const restored: FormValues = {
      ...EMPTY_VALUES,
      ...withoutUndefined(draftValues),
      ...withoutUndefined(valuesFromProfile(profile)),
    };
    if (!restored.name && user.displayName) restored.name = user.displayName;
    if (!restored.photoURL && user.photoURL) restored.photoURL = user.photoURL;

    form.reset(restored);

    if (initialStep > 0) setResumedStep(initialStep);
    else setShowWelcome(true);

    const experience = restored.experienceLevel;
    if (experience && !EXPERIENCE_LEVELS.some((level) => level.value === experience)) {
      setIsCustomExp(true);
      setCustomExpValue(experience);
    }

    const gender = restored.gender || '';
    if (gender && !STANDARD_GENDERS.includes(gender.toLowerCase())) {
      setIsCustomGender(true);
      setCustomGenderValue(gender);
    }

    setStep(initialStep);
    setInitialized(true);
  }, [user, profile, savedAuthStep, initialized, form]);

  // Fields from the earlier sign-up form stay on the profile so nobody loses data.
  const toProfileFields = (data: FormValues): Partial<UserProfile> => ({
    name: data.name || '',
    headline: data.headline || '',
    bio: data.bio || '',
    location: data.location || '',
    age: data.age || 18,
    gender: data.gender || '',
    photoURL: data.photoURL || '',
    currentWork: data.currentWork || '',
    jobTitle: profile?.jobTitle || '',
    experienceLevel: data.experienceLevel || DEFAULT_EXPERIENCE,
    company: data.company || '',
    college: data.college || '',
    industry: data.industry || '',
    techStack: splitList(data.techStack),
    interests: splitList(data.interests),
    canHelpWith: data.canHelpWith || [],
    currentlyLearning: data.currentlyLearning || [],
    guidanceWanted: data.guidanceWanted || [],
    conversationPreferences: data.conversationPreferences || [],
    networkingTags: profile?.networkingTags || [],
    links: {
      github: data.github || '',
      linkedin: data.linkedin || '',
    },
  });

  const getCurrentProfileSnapshot = (stepIndex: number): Partial<UserProfile> => ({
    ...toProfileFields(form.getValues()),
    onboarding_completed: false,
    onboarding_step: stepIndex,
  });

  const nextStep = async () => {
    const currentFields = allSteps[step].fields as readonly (keyof FormValues)[];
    const isValid = await form.trigger(currentFields as (keyof FormValues)[]);
    if (!isValid) return;

    const nextStepIndex = Math.min(step + 1, allSteps.length - 1);
    setStep(nextStepIndex);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (user) {
      const partialData = getCurrentProfileSnapshot(nextStepIndex);
      try {
        localStorage.setItem(
          `stackswipe_onboarding_draft_${user.id}`,
          JSON.stringify({ step: nextStepIndex, data: partialData })
        );
      } catch (err) {
        console.warn('Could not save draft locally:', err);
      }
      saveOnboardingProgress(nextStepIndex, partialData).catch((err) => {
        console.warn('Background step progress sync notice:', err);
      });
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 0));

  const handleSaveAndSignOut = async () => {
    setIsSaving(true);
    try {
      await saveOnboardingProgress(step, getCurrentProfileSnapshot(step));
      toast({
        title: 'Progress saved',
        description: 'Pick up where you left off next time you log in.',
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
      if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
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
        title: 'Please log in',
        description: 'You need to be logged in to finish setting up.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const userId = user.id;
    const newProfile = {
      ...toProfileFields(data),
      id: userId,
      onboarding_completed: true,
      onboarding_step: FINAL_STEP_INDEX,
    } as UserProfile;

    const goToDashboard = () => {
      router.replace('/dashboard');
      setTimeout(() => {
        if (window.location.pathname.includes('/onboarding')) {
          window.location.href = '/dashboard';
        }
      }, 350);
    };

    try {
      localStorage.removeItem(`stackswipe_onboarding_draft_${userId}`);
      localStorage.setItem(
        `stackswipe_onboarding_${userId}`,
        JSON.stringify({ onboarding_completed: true, onboarding_step: FINAL_STEP_INDEX })
      );
      localStorage.setItem('stackswipe_cached_profile', JSON.stringify(newProfile));

      await updateProfile(newProfile);

      toast({
        title: 'Welcome to StackSwipe!',
        description: 'Your next great conversation could be one swipe away.',
      });
    } catch (error) {
      console.warn('Profile completion proceeding with cached profile:', error);
      toast({
        title: 'Welcome to StackSwipe!',
        description: 'Your next great conversation could be one swipe away.',
      });
    } finally {
      goToDashboard();
      setIsSubmitting(false);
    }
  };

  const progress = ((step + 1) / allSteps.length) * 100;
  const photoURL = form.watch('photoURL');

  if (showWelcome) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--c-pink)] p-4 text-[color:var(--c-ink)] sm:p-6">
        <div className="w-full max-w-xl text-center">
          <Stacky className="mx-auto mb-4 w-24" />
          <h1 className="font-headline text-7xl font-bold leading-[0.85] sm:text-8xl">Everyone starts somewhere.</h1>
          <p className="mx-auto mt-6 max-w-md text-lg font-medium">
            Find people who can guide you, share what you know, and discover a community where every question is welcome.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={() => setShowWelcome(false)}
            className="mt-8 h-14 bg-[color:var(--c-butter)] px-8 text-2xl text-[color:var(--c-ink)]"
          >
            Find Your People
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid p-4 sm:p-6">
      <Card className="w-full max-w-xl bg-card">
        <CardHeader className="space-y-3 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stacky className="w-9" />
              <span className="font-label text-xs text-foreground">
                Step {step + 1} of {allSteps.length}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSaveAndSignOut}
              disabled={isSaving || isSubmitting}
              className="flex h-8 items-center gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Save & Exit
            </Button>
          </div>

          <Progress value={progress} className="h-4 border-2 border-foreground bg-card" />

          <div className="flex items-center justify-between px-1 pt-1">
            {allSteps.map((s, idx) => (
              <div key={s.id} className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center border-2 border-foreground font-headline text-base font-bold transition-colors duration-150 ${
                    idx < step
                      ? 'bg-primary text-primary-foreground'
                      : idx === step
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {idx < step ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                </div>
              </div>
            ))}
          </div>

          {resumedStep !== null && (
            <div className="mt-2 flex items-center justify-between border-2 bg-secondary px-3 py-2 text-xs text-secondary-foreground">
              <span className="flex items-center gap-1.5 font-medium">
                <BookmarkCheck className="h-4 w-4" />
                Welcome back. We saved your progress.
              </span>
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                Auto-saved
              </Badge>
            </div>
          )}

          <div>
            <CardTitle key={step} className="animate-step-in font-headline text-4xl font-bold leading-none">
              {allSteps[step].name}
            </CardTitle>
            <CardDescription className="mt-1 text-sm">{allSteps[step].description}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onKeyDown={(e) => {
                // Enter in a text box should not finish the whole form early.
                if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
              }}
              className="space-y-5"
            >
              {step === 0 && (
                <div className="animate-step-in space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="What should people call you?" />
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
                          <FormDescription className="text-xs">StackSwipe is for adults. Not shown on your card.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => {
                        const isOther =
                          isCustomGender || (!STANDARD_GENDERS.includes(field.value?.toLowerCase() || '') && !!field.value);

                        return (
                          <FormItem>
                            <FormLabel>Gender (optional)</FormLabel>
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
                                  <SelectValue placeholder="Select" />
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
                              <div className="mt-2">
                                <Input
                                  aria-label="Your gender"
                                  placeholder="How do you describe it?"
                                  value={customGenderValue || (STANDARD_GENDERS.includes(field.value || '') ? '' : field.value)}
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
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Bengaluru or Remote" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="headline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>One line about you (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Teaching myself Python after a career in teaching" />
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
                        <FormLabel>A bit more (optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="What are you working on, curious about or figuring out?" rows={3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 1 && (
                <FormField
                  control={form.control}
                  name="photoURL"
                  render={({ field }) => (
                    <FormItem className="flex flex-col items-center py-4">
                      <FormLabel className="mb-3 text-base font-semibold">Profile photo</FormLabel>
                      <FormControl>
                        <div className="flex flex-col items-center gap-4">
                          <Avatar className="h-32 w-32 border-4">
                            <AvatarImage src={photoURL || field.value} alt="Your profile photo" />
                            <AvatarFallback className="bg-muted">
                              <UserIcon className="h-16 w-16 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              disabled={isUploadingPhoto}
                              className="max-w-xs text-xs"
                            />
                            {isUploadingPhoto && (
                              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Processing image…
                              </p>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription className="mt-3 max-w-sm text-center text-xs">
                        You can always add one later from your profile.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {step === 2 && (
                <div className="animate-step-in space-y-4">
                  <FormField
                    control={form.control}
                    name="currentWork"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current role (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Student, Software Engineer, Switching careers" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="experienceLevel"
                    render={({ field }) => {
                      const isPreset = EXPERIENCE_LEVELS.some((p) => p.value === field.value);
                      const currentSelectValue = isCustomExp ? 'custom' : isPreset ? field.value : 'custom';

                      return (
                        <FormItem>
                          <FormLabel>Experience level</FormLabel>
                          <Select
                            value={currentSelectValue}
                            onValueChange={(val) => {
                              if (val === 'custom') {
                                setIsCustomExp(true);
                                field.onChange(customExpValue.trim() || 'Custom');
                              } else {
                                setIsCustomExp(false);
                                setCustomExpValue('');
                                field.onChange(val);
                              }
                            }}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select your experience level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXPERIENCE_LEVELS.map((level) => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="custom">Something else</SelectItem>
                            </SelectContent>
                          </Select>

                          {isCustomExp && (
                            <div className="mt-2">
                              <Input
                                aria-label="Your experience in your own words"
                                placeholder="In your own words"
                                value={customExpValue || (isPreset ? '' : field.value)}
                                onChange={(e) => {
                                  setCustomExpValue(e.target.value);
                                  field.onChange(e.target.value);
                                }}
                                className="h-10 text-sm"
                              />
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company (optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Stripe" />
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
                            <Input {...field} placeholder="e.g., IIT Delhi" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Fintech, Healthcare, Education" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="techStack"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills and tools (optional, comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Python, Figma, SQL" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="interests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Areas of interest (optional, comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., AI, Open source, Startups" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="animate-step-in space-y-6">
                  <FormField
                    control={form.control}
                    name="canHelpWith"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">What I can help with</FormLabel>
                        <FormDescription className="text-xs">
                          Your experience could be exactly what someone else needs. It does not have to be technical.
                        </FormDescription>
                        <TagPicker
                          options={CAN_HELP_OPTIONS}
                          value={field.value || []}
                          onChange={field.onChange}
                          customPlaceholder="Add something else you could help with"
                        />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentlyLearning"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">What I&apos;m currently learning</FormLabel>
                        <TagPicker
                          options={LEARNING_OPTIONS}
                          value={field.value || []}
                          onChange={field.onChange}
                          customPlaceholder="Add something else you are learning"
                        />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guidanceWanted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">What I&apos;d love guidance on</FormLabel>
                        <TagPicker
                          options={GUIDANCE_OPTIONS}
                          value={field.value || []}
                          onChange={field.onChange}
                          customPlaceholder="Add something else you would like guidance on"
                        />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 4 && (
                <div className="animate-step-in space-y-4">
                  <FormField
                    control={form.control}
                    name="github"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GitHub profile URL (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://github.com/your-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LinkedIn profile URL (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://linkedin.com/in/your-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 5 && (
                <div className="animate-step-in space-y-6">
                  <FormField
                    control={form.control}
                    name="conversationPreferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base font-semibold">I&apos;m up for</FormLabel>
                        <TagPicker
                          options={CONVERSATION_PREFERENCES}
                          value={field.value || []}
                          onChange={field.onChange}
                          allowCustom={false}
                        />
                      </FormItem>
                    )}
                  />

                  <section className="border-2 bg-muted p-4">
                    <h2 className="mb-3 font-label text-xs">How we look after each other</h2>
                    <CommunityPrinciplesList />
                  </section>
                </div>
              )}

              <div className="flex items-center justify-between border-t-2 pt-4">
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
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting || isSaving} className="flex items-center gap-1.5 px-6">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finishing up…
                      </>
                    ) : (
                      <>
                        Join the community
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
