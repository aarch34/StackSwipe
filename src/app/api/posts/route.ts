import { NextResponse } from 'next/server';

// In-memory storage for testing
const posts: any[] = [];

export async function GET() {
  console.log('📖 GET /api/posts - returning', posts.length, 'posts');
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📝 POST /api/posts - received:', body);
    
    const newPost = {
      id: `post_${Date.now()}`,
      title: body.title,
      content: body.content,
      category: body.category,
      tags: body.tags || [],
      upvotes: 0,
      comment_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: '1',
        name: 'Ananth U',
        photoURL: '',
        jobTitle: 'Full Stack Developer',
        company: 'StackSwipe'
      }
    };
    
    posts.unshift(newPost);
    
    console.log('✅ Post created successfully:', newPost.id);
    return NextResponse.json({ post: newPost });
    
  } catch (error) {
    console.error('❌ POST /api/posts error:', error);
    return NextResponse.json(
      { error: `Server error: ${error}` },
      { status: 500 }
    );
  }
}
