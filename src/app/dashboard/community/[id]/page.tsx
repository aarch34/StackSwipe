'use client';

import { useState, useEffect } from 'react';
import { use } from 'react'; // Add this import
import { ArrowLeft, MessageSquare, ThumbsUp, Share2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Post, Comment } from '@/lib/data';

interface PostDetailPageProps {
  params: Promise<{ id: string }>; // Changed this line
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const { toast } = useToast();
  const resolvedParams = use(params); // Add this line
  const postId = resolvedParams.id; // Use resolved params
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    loadPost();
    loadComments();
  }, [postId]); // Use postId instead of params.id

  const loadPost = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const data = await response.json();
      setPost(data.post);
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await fetch(`/api/posts/${postId}/comments`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setCommenting(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() })
      });

      if (!response.ok) throw new Error('Failed to post comment');

      const { comment } = await response.json();
      setComments(prev => [...prev, { ...comment, replies: [] }]);
      setNewComment('');
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added to the discussion'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post comment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setCommenting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center py-8">Loading discussion...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="text-center py-8">Discussion not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
        </Link>
      </div>

      {/* Post */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.user?.photoURL} alt={post.user?.name} />
              <AvatarFallback>{post.user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold">{post.user?.name}</span>
                <span className="text-sm text-muted-foreground">
                  {post.user?.jobTitle} at {post.user?.company}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                <Badge variant="secondary" className="capitalize">
                  {post.category.replace('-', ' ')}
                </Badge>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <h1 className="text-2xl font-bold mb-4">{post.title}</h1>
          <div className="prose max-w-none mb-4">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ThumbsUp className="h-4 w-4" />
              {post.upvotes} upvotes
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {post.comment_count} comments
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Comment */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <form onSubmit={handleComment}>
            <Textarea
              placeholder="Add your thoughts to the discussion..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-3"
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={commenting || !newComment.trim()}>
                {commenting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Comments */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          Comments ({comments.length})
        </h3>
        
        {comments.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No comments yet. Be the first to share your thoughts!
            </CardContent>
          </Card>
        ) : (
          <div className="text-center text-muted-foreground">
            Comments feature coming soon!
          </div>
        )}
      </div>
    </div>
  );
}
