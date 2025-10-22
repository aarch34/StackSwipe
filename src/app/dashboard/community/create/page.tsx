'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import type { Category } from '@/lib/data';

export default function CreatePostPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content || !formData.category) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const { post } = await response.json();
      toast({
        title: 'Success',
        description: 'Your post has been created!'
      });
      router.push(`/dashboard/community/${post.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag] }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const generateAIContent = async () => {
    if (!formData.title) {
      toast({
        title: 'Add a title first',
        description: 'Enter a title to get AI content suggestions',
        variant: 'destructive'
      });
      return;
    }

    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/post-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category
        })
      });

      if (response.ok) {
        const { suggestion } = await response.json();
        setFormData(prev => ({ ...prev, content: suggestion }));
        toast({
          title: 'AI Suggestion Generated',
          description: 'Feel free to edit the content as needed!'
        });
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      toast({
        title: 'AI Unavailable',
        description: 'AI suggestions are temporarily unavailable',
        variant: 'destructive'
      });
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Post</h1>
          <p className="text-muted-foreground">Share your thoughts with the community</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Discussion</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="text-sm font-medium mb-2 block">Title *</label>
              <Input
                placeholder="What's your question or topic?"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium mb-2 block">Category *</label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      <div className="flex items-center gap-2">
                        <span>{category.icon}</span>
                        <span className="capitalize">{category.name.replace('-', ' ')}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Content *</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateAIContent}
                  disabled={aiLoading || !formData.title}
                >
                  {aiLoading ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-2" />
                  )}
                  AI Assist
                </Button>
              </div>
              <Textarea
                placeholder="Share your thoughts, ask questions, or start a discussion..."
                className="min-h-[200px]"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add tags..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                    {tag} ×
                  </Badge>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Create Post
              </Button>
              <Link href="/dashboard/community">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
