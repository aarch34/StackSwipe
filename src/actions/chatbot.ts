// Genkit Chatbot Server Action
'use server';

import { chat, ChatInput } from "@/ai/flows/chatbot";

export async function postChatMessage(input: ChatInput) {
    try {
        const result = await chat(input);
        return result;
    } catch (error) {
        console.error(error);
        return { error: 'Failed to get chat response.' };
    }
}
