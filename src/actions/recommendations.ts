
'use server';

import { profileRecommendation, ProfileRecommendationInput } from "@/ai/flows/profile-recommendation";

export async function getRecommendations(input: Omit<ProfileRecommendationInput, 'allProfiles'>) {
    try {
        const result = await profileRecommendation(input);
        return result;
    } catch (error) {
        console.error(error);
        return { error: 'Failed to get recommendations.' };
    }
}
