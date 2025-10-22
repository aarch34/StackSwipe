'use client';

import { useState } from 'react';
import { ThumbsUp, Reply, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import type { Comment } from '@/lib/data';

interface CommentThreadProps {
  comment: Comment;
  postId: string;
  onReply: () => void;
  depth?: number;
}

export function CommentThread({ comment, postId, onReply, depth = 0 }: CommentThreadProps) {
  const { toast } = useToast();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    setReplying(true);
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent.trim(),
          parent_comment_id: comment.id
        })
      });

      if (!response.ok) throw new Error('Failed to post reply');

      setReplyContent('');
      setShowReplyForm(false);
      onReply();
      toast({
        title: 'Reply posted',
        description: 'Your reply has been added to the discussion'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post reply. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.user?.photoURL} alt={comment.user?.name} />
              <AvatarFallback>{comment.user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm">{comment.user?.name}</span>
                <span className="text-xs text-muted-foreground">
                  {comment.user?.jobTitle} at {comment.user?.company}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm mb-3 whitespace-pre-wrap">{comment.content}</p>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  {comment.upvotes}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                <Button variant="ghost" size="sm" className="h-7 px-1">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </div>

              {/* Reply Form */}
              {showReplyForm && (
                <form onSubmit={handleReply} className="mt-3">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="mb-2"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={replying || !replyContent.trim()}>
                      {replying ? 'Posting...' : 'Reply'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowReplyForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              postId={postId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
