
'use server';

/**
 * @fileOverview AI-driven profile recommendations based on user networking goals and profile details.
 *
 * - profileRecommendation - A function that recommends relevant profiles.
 * - ProfileRecommendationInput - The input type for the profileRecommendation function.
 * - ProfileRecommendationOutput - The return type for the profileRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getAllUsers } from '@/lib/users';
import { UserProfile } from '@/lib/data';

const ProfileRecommendationInputSchema = z.object({
  networkingGoals: z
    .string()
    .describe('The networking goals of the user, e.g., mentor, mentee, teammate, looking for referrals.'),
  profileDetails: z.string().describe('The profile details of the user, including bio, headline, current work, skills, and interests.'),
  allProfiles: z.array(z.custom<UserProfile>()).describe('A list of all user profiles in the app.'),
});

export type ProfileRecommendationInput = z.infer<typeof ProfileRecommendationInputSchema>;

const ProfileRecommendationOutputSchema = z.object({
  recommendedProfiles: z
    .array(z.string())
    .describe('A list of recommended profile summaries based on the user networking goals and profile details.'),
});

export type ProfileRecommendationOutput = z.infer<typeof ProfileRecommendationOutputSchema>;

export async function profileRecommendation(input: Omit<ProfileRecommendationInput, 'allProfiles'>): Promise<ProfileRecommendationOutput> {
  const allProfiles = await getAllUsers();
  const flowInput: ProfileRecommendationInput = {
    ...input,
    allProfiles,
  };
  return profileRecommendationFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'profileRecommendationPrompt',
  input: {schema: ProfileRecommendationInputSchema},
  output: {schema: ProfileRecommendationOutputSchema},
  prompt: `You are an AI assistant designed to provide profile recommendations based on user networking goals and their profile details.

You will be given a list of all available user profiles. Your task is to recommend a few relevant profile summaries from this list that best match the user's goals.

Do not invent profiles. Only use the data from the "All Available Profiles" list.

Networking Goals: {{{networkingGoals}}}
My Profile Details: {{{profileDetails}}}

All Available Profiles:
---
{{#each allProfiles}}
- Name: {{this.name}}
  Headline: {{this.headline}}
  Bio: {{this.bio}}
  Tech Stack: {{#each this.techStack}}{{{this}}}{{/each}}
  Interests: {{#each this.interests}}{{{this}}}{{/each}}
  Networking Goals: {{#each this.networkingTags}}{{{this}}}{{/each}}
---
{{/each}}

Based on the user's goals and profile, provide a list of recommended profile summaries from the available list.
Recommended Profiles:`,
});

const profileRecommendationFlow = ai.defineFlow(
  {
    name: 'profileRecommendationFlow',
    inputSchema: ProfileRecommendationInputSchema,
    outputSchema: ProfileRecommendationOutputSchema,
  },
  async input => {
    // Filter out the current user's own profile from the list of all profiles
    // to avoid recommending the user to themselves.
    const currentUserProfile = JSON.parse(input.profileDetails);
    const otherProfiles = input.allProfiles.filter(p => p.headline !== currentUserProfile.headline);

    const {output} = await prompt({...input, allProfiles: otherProfiles });
    return output!;
  }
);
