'use client';

import { Heart } from '@/components/px-icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { COMMUNITY_PRINCIPLES } from '@/lib/guidance';

export function CommunityPrinciplesList() {
  return (
    <ol className="space-y-2">
      {COMMUNITY_PRINCIPLES.map((principle, index) => (
        <li key={principle} className="flex items-start gap-3 text-sm">
          <span className="font-label text-xs leading-5 text-muted-foreground">{index + 1}</span>
          <span className="font-medium">{principle}</span>
        </li>
      ))}
    </ol>
  );
}

export function CommunityPrinciplesDialog({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-3xl">
            <Heart className="h-6 w-6" />
            How we look after each other
          </DialogTitle>
          <DialogDescription>
            A community where people connect, learn, share and grow together.
          </DialogDescription>
        </DialogHeader>
        <CommunityPrinciplesList />
      </DialogContent>
    </Dialog>
  );
}
