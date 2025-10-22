'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Post, Category } from '@/lib/data';

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
    loadCategories();
  }, [selectedCategory]);

  const loadPosts = async () => {
    try {
      const response = await fetch(`/api/posts?category=${selectedCategory}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('Raw response:', text);
      
      const data = JSON.parse(text);
      setPosts(data.posts || []);
    } catch (error) {
      console.error('Error loading posts:', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };
  

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">Connect, discuss, and learn with tech professionals</p>
        </div>
        <Link href="/dashboard/community/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Post
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search discussions..." className="pl-10" />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.name ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory(category.name)}
            className="whitespace-nowrap"
          >
            <span className="mr-1">{category.icon}</span>
            {category.name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">Loading discussions...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No discussions found. Be the first to start a conversation!
          </div>
        ) : (
          posts.map((post) => (
            <Link key={post.id} href={`/dashboard/community/${post.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.user?.photoURL} alt={post.user?.name} />
                      <AvatarFallback>{post.user?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{post.user?.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {post.user?.jobTitle} at {post.user?.company}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">{post.title}</h3>
                      <p className="text-muted-foreground mb-3 line-clamp-2">{post.content}</p>
                      <div className="flex items-center gap-4">
                        <Badge variant="secondary" className="capitalize">
                          {categories.find(c => c.name === post.category)?.icon} {post.category.replace('-', ' ')}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {post.upvotes} upvotes
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {post.comment_count} comments
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
