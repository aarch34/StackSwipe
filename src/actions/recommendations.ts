'use server';

import { profileRecommendation, ProfileRecommendationInput } from "@/ai/flows/profile-recommendation";

export async function getRecommendations(input: Omit<ProfileRecommendationInput, 'allProfiles'>) {
    try {
        console.log('Getting recommendations for:', input.networkingGoals);
        const result = await profileRecommendation(input);
        console.log('Recommendations result:', result);
        return result;
    } catch (error) {
        console.error('Failed to get recommendations:', error);
        return { error: 'Failed to get recommendations.' };
    }
}
