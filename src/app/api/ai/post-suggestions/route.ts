import { NextRequest, NextResponse } from 'next/server';
import { generatePostSuggestion } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { title, category } = await request.json();

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const suggestion = await generatePostSuggestion(title, category);

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Error in post suggestions API:', error);
    return NextResponse.json(
      { error: 'Failed to generate post suggestion' },
      { status: 500 }
    );
  }
}
