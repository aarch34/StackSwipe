'use client';
import Link from 'next/link';
import { Briefcase, Building, Code, Github, GraduationCap, Heart, Linkedin, MapPin } from 'lucide-react';
import { type UserProfile } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ScrollArea } from './ui/scroll-area';

interface ProfileCardProps {
  profile: UserProfile;
}

const ProfileSection: React.FC<{ icon: React.ElementType; title: string; children: React.ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="py-4">
    <div className="flex items-center gap-3 mb-3">
      <Icon className="size-5 text-muted-foreground" />
      <h3 className="font-semibold text-lg">{title}</h3>
    </div>
    <div className="pl-8 space-y-2 text-sm text-muted-foreground">
      {children}
    </div>
  </div>
);


export function ProfileCard({ profile }: ProfileCardProps) {
  const photo = profile.photoURL;

  return (
    <Card className="w-full max-w-sm rounded-2xl shadow-xl h-full overflow-hidden flex flex-col">
        <ScrollArea className="flex-1">
            <div className="relative h-[500px] w-full group">
                 {photo ? (
                    <Image
                        src={photo}
                        alt={profile.name}
                        fill
                        className="object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900 to-gray-800" />
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                 <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
                    <h1 className="font-headline text-3xl">{profile.name}, {profile.age}</h1>
                    <p className="text-sm text-neutral-300">{profile.headline}</p>
                 </div>
            </div>

             <div className="p-6 bg-background text-foreground flex-1">
                <div className="border-b pb-4">
                    <h2 className="font-semibold text-xl mb-2">About Me</h2>
                    <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
                
                {profile.networkingTags && profile.networkingTags.length > 0 && (
                    <ProfileSection icon={Heart} title="Looking For">
                        <div className="flex flex-wrap gap-2">
                            {profile.networkingTags?.map((tag) => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                            ))}
                        </div>
                    </ProfileSection>
                )}

                <ProfileSection icon={Briefcase} title="Work">
                    <p><span className='font-semibold'>{profile.experienceLevel}</span> at <span className='font-semibold'>{profile.company || 'Not specified'}</span></p>
                    <p>{profile.currentWork}</p>
                </ProfileSection>
                
                <ProfileSection icon={GraduationCap} title="Education">
                    <p>{profile.college || 'Not specified'}</p>
                </ProfileSection>

                <ProfileSection icon={MapPin} title="Location">
                    <p>{profile.location}</p>
                </ProfileSection>

                {profile.techStack && profile.techStack.length > 0 && (
                     <ProfileSection icon={Code} title="My Stack">
                        <div className="flex flex-wrap gap-2">
                            {profile.techStack.map((skill) => (
                                <Badge key={skill} variant="outline">{skill}</Badge>
                            ))}
                        </div>
                    </ProfileSection>
                )}

                {profile.interests && profile.interests.length > 0 && (
                    <ProfileSection icon={SparklesIcon} title="Interests">
                        <div className="flex flex-wrap gap-2">
                            {profile.interests.map((interest) => (
                                <Badge key={interest} variant="outline">{interest}</Badge>
                            ))}
                        </div>
                    </ProfileSection>
                )}

                <div className="py-4 flex items-center justify-center gap-6">
                    {profile.links?.github && (
                        <Link href={profile.links.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Github className="h-8 w-8" />
                        </Link>
                    )}
                    {profile.links?.linkedin && (
                        <Link href={profile.links.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                            <Linkedin className="h-8 w-8" />
                        </Link>
                    )}
                </div>
            </div>
        </ScrollArea>
    </Card>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9L12 18l1.9-5.8 5.8-1.9-5.8-1.9Z" />
    </svg>
  )
}