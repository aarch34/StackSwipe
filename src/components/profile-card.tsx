
'use client';
import Link from 'next/link';
import { Github, Linkedin, Briefcase, Code, Sparkles as InterestIcon, MapPin, Building, GraduationCap } from 'lucide-react';
import { type UserProfile } from '@/lib/data';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ProfileCardProps {
  profile: UserProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const photo = profile.photoURL || `https://picsum.photos/seed/${profile.id}/600/800`;
    
  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-2xl h-full overflow-hidden">
        <div className="relative h-full w-full">
             <Image 
                src={photo}
                alt={profile.name}
                fill
                className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                <CardHeader className="p-0">
                    <CardTitle className="font-headline text-3xl">{profile.name}, {profile.age}</CardTitle>
                    <div className="text-sm text-neutral-300">{profile.headline}</div>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                     <p className="text-sm text-neutral-200 line-clamp-3">{profile.bio}</p>
                </CardContent>
                <CardFooter className="p-0 mt-4 flex items-center gap-4">
                    <Link href={profile.links.github || '#'} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-white">
                        <Github className="h-6 w-6" />
                    </Link>
                    <Link href={profile.links.linkedin || '#'} target="_blank" rel="noopener noreferrer" className="text-neutral-300 hover:text-white">
                        <Linkedin className="h-6 w-6" />
                    </Link>
                </CardFooter>
            </div>
        </div>
    </Card>
  );
}
