import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:users(id, name, photoURL, jobTitle, company)
      `)
      .eq('post_id', params.id)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const { data: replies } = await supabase
          .from('comments')
          .select(`
            *,
            user:users(id, name, photoURL, jobTitle, company)
          `)
          .eq('parent_comment_id', comment.id)
          .order('created_at', { ascending: true });

        return { ...comment, replies: replies || [] };
      })
    );

    return NextResponse.json({ comments: commentsWithReplies });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content, parent_comment_id } = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's internal ID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('firebase_uid', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id: params.id,
        user_id: userData.id,
        content,
        parent_comment_id
      })
      .select(`
        *,
        user:users(id, name, photoURL, jobTitle, company)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
