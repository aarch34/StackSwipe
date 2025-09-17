
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Icons.logo className="size-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-headline">Join StackSwipe</CardTitle>
          <CardDescription>
            Connect with tech professionals. Your next opportunity awaits.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
           <Button asChild>
              <Link href="/signup">Create an Account</Link>
           </Button>
           <Button variant="outline" asChild>
              <Link href="/login">Login to Your Account</Link>
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
