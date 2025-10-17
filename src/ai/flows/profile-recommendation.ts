'use server';

import { profileRecommendation, ProfileRecommendationInput } from "@/ai/flows/profile-recommendation";
import { getAllUsers } from '@/lib/users';

export async function getRecommendations(input: Omit<ProfileRecommendationInput, 'allProfiles'>) {
    try {
        console.log('=== DEBUGGING RECOMMENDATIONS ===');
        console.log('Input:', input);
        
        // Test direct database access
        const allUsers = await getAllUsers();
        console.log('Direct getAllUsers result:', allUsers);
        console.log('Number of users found:', allUsers.length);
        
        if (allUsers.length > 0) {
            console.log('First user example:', allUsers[0]);
        }
        
        const result = await profileRecommendation(input);
        console.log('Final recommendation result:', result);
        
        return result;
    } catch (error) {
        console.error('Error in getRecommendations:', error);
        return { error: 'Failed to get recommendations: ' + error.message };
    }
}
