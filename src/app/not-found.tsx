import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Stacky } from '@/components/pixel/sprites';

export const metadata = {
  title: 'Page not found | StackSwipe',
};

export default function NotFound() {
  return (
    <main className="bg-grid flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <Stacky walking className="w-28" />
      <h1 className="font-headline text-[clamp(5rem,20vw,11rem)] font-bold leading-none">404</h1>
      <p className="max-w-sm text-lg">Stacky walked all over this level and could not find that page.</p>
      <Button asChild size="lg">
        <Link href="/">Back to the start</Link>
      </Button>
    </main>
  );
}
