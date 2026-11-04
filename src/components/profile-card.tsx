'use client';

import React from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Code,
  Github,
  GraduationCap,
  Heart,
  Linkedin,
  MapPin,
  Sparkles,
  MessageSquare,
  CheckCircle2,
} from '@/components/px-icons';
import { type UserProfile } from '@/lib/data';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { ReportUserDialog } from '@/components/report-user-dialog';
import { PixelImage } from '@/components/pixel/pixel-image';

interface ProfileCardProps {
  profile: UserProfile;
  variant?: 'swipe' | 'dialog';
}

const ProfileSection: React.FC<{
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="space-y-2 border-2 bg-background p-3">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5" />
      <h3 className="font-label text-xs">{title}</h3>
    </div>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
);

const NAME_PLATE = 'bg-[color:var(--c-ink)] text-[color:var(--c-cream)]';
const GOAL_TILE = 'inline-flex items-center gap-1 border-2 bg-primary px-2 py-1 text-xs font-medium text-primary-foreground';
const STACK_TILE = 'border-2 bg-accent px-2 py-1 font-headline text-base font-medium leading-none text-accent-foreground';
const INTEREST_TILE = 'border-2 bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground';

export function ProfileCard({ profile, variant = 'swipe' }: ProfileCardProps) {
  const photo = profile.photoURL;
  const isDialog = variant === 'dialog';

  if (isDialog) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-card text-card-foreground">
        {/* Fixed hero header with photo */}
        <div className="relative h-[250px] w-full flex-shrink-0 overflow-hidden bg-muted sm:h-[270px]">
          {photo ? (
            <PixelImage
              src={photo}
              alt={profile.name}
              fill
              priority
              sizes="(max-width: 640px) 94vw, 512px"
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <span className="select-none font-headline text-8xl font-bold">
                {profile.name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}

          {/* Name plate */}
          <div className={`absolute inset-x-0 bottom-0 p-4 ${NAME_PLATE}`}>
            <div className="mb-2 inline-flex w-fit items-center gap-1.5 bg-[color:var(--c-leaf)] px-2 py-0.5 font-label text-xs text-[color:var(--c-ink)]">
              Connected Match
            </div>

            <h2 className="font-headline text-4xl font-bold leading-none">
              {profile.name}
              {profile.age && <span className="ml-2 text-2xl font-normal">{profile.age}</span>}
            </h2>

            {profile.headline && <p className="mt-1 line-clamp-1 text-sm">{profile.headline}</p>}

            {/* Quick metadata */}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {(profile.jobTitle || profile.company) && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {profile.jobTitle || profile.experienceLevel || 'Developer'}
                  {profile.company ? ` @ ${profile.company}` : ''}
                </span>
              )}

              {profile.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable profile details */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-3 p-4">
            {profile.bio && (
              <ProfileSection icon={Sparkles} title="About">
                <p className="leading-relaxed">{profile.bio}</p>
              </ProfileSection>
            )}

            {profile.networkingTags && profile.networkingTags.length > 0 && (
              <ProfileSection icon={Heart} title="Looking For">
                <div className="flex flex-wrap gap-1.5">
                  {profile.networkingTags.map((tag) => (
                    <span key={tag} className={GOAL_TILE}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            )}

            {(profile.company || profile.experienceLevel || profile.currentWork) && (
              <ProfileSection icon={Briefcase} title="Work Experience">
                <p className="font-medium">
                  <span className="font-semibold">{profile.jobTitle || profile.experienceLevel}</span>
                  {profile.company ? (
                    <>
                      {' '}at <span className="font-semibold">{profile.company}</span>
                    </>
                  ) : null}
                </p>
                {profile.currentWork && (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{profile.currentWork}</p>
                )}
              </ProfileSection>
            )}

            {profile.college && (
              <ProfileSection icon={GraduationCap} title="Education">
                <p className="font-medium">{profile.college}</p>
              </ProfileSection>
            )}

            {profile.techStack && profile.techStack.length > 0 && (
              <ProfileSection icon={Code} title="My Tech Stack">
                <div className="flex flex-wrap gap-1.5">
                  {profile.techStack.map((skill) => (
                    <span key={skill} className={STACK_TILE}>
                      {skill}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            )}

            {profile.interests && profile.interests.length > 0 && (
              <ProfileSection icon={Sparkles} title="Interests">
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((interest) => (
                    <span key={interest} className={INTEREST_TILE}>
                      {interest}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            )}

            {(profile.links?.github || profile.links?.linkedin) && (
              <div className="space-y-2 border-2 bg-background p-3">
                <h3 className="font-label text-xs">Social Profiles</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {profile.links?.github && (
                    <Link
                      href={profile.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border-2 bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Github className="h-4 w-4" />
                      <span>GitHub</span>
                    </Link>
                  )}
                  {profile.links?.linkedin && (
                    <Link
                      href={profile.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 border-2 bg-card px-3 py-2 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Linkedin className="h-4 w-4" />
                      <span>LinkedIn</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action bar */}
        <div className="border-t-2 bg-card p-4">
          <DialogClose asChild>
            <Button className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message {profile.name?.split(' ')[0] || 'Match'}
            </Button>
          </DialogClose>
        </div>
      </div>
    );
  }

  // Swipe card layout
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-card text-card-foreground">
      <ScrollArea className="flex-1">
        <div className="group relative h-[440px] w-full bg-muted">
          {photo ? (
            <PixelImage
              src={photo}
              alt={profile.name}
              fill
              sizes="(max-width: 640px) 94vw, 384px"
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <span className="select-none font-headline text-9xl font-bold">
                {profile.name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}
          <div className={`absolute inset-x-0 bottom-0 p-4 ${NAME_PLATE}`}>
            <h2 className="font-headline text-4xl font-bold leading-none">
              {profile.name}, {profile.age}
            </h2>
            <p className="mt-1 text-sm">{profile.headline}</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 p-4">
          {profile.bio && (
            <div className="pb-1">
              <h3 className="mb-1 font-label text-xs">About Me</h3>
              <p className="text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {profile.networkingTags && profile.networkingTags.length > 0 && (
            <ProfileSection icon={Heart} title="Looking For">
              <div className="flex flex-wrap gap-1.5">
                {profile.networkingTags.map((tag) => (
                  <span key={tag} className={GOAL_TILE}>
                    {tag}
                  </span>
                ))}
              </div>
            </ProfileSection>
          )}

          <ProfileSection icon={Briefcase} title="Work">
            <p>
              <span className="font-semibold">{profile.experienceLevel}</span> at{' '}
              <span className="font-semibold">{profile.company || 'Not specified'}</span>
            </p>
            {profile.currentWork && <p className="mt-1 text-xs text-muted-foreground">{profile.currentWork}</p>}
          </ProfileSection>

          {profile.college && (
            <ProfileSection icon={GraduationCap} title="Education">
              <p>{profile.college}</p>
            </ProfileSection>
          )}

          {profile.location && (
            <ProfileSection icon={MapPin} title="Location">
              <p>{profile.location}</p>
            </ProfileSection>
          )}

          {profile.techStack && profile.techStack.length > 0 && (
            <ProfileSection icon={Code} title="My Stack">
              <div className="flex flex-wrap gap-1.5">
                {profile.techStack.map((skill) => (
                  <span key={skill} className={STACK_TILE}>
                    {skill}
                  </span>
                ))}
              </div>
            </ProfileSection>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <ProfileSection icon={Sparkles} title="Interests">
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <span key={interest} className={INTEREST_TILE}>
                    {interest}
                  </span>
                ))}
              </div>
            </ProfileSection>
          )}

          {(profile.links?.github || profile.links?.linkedin) && (
            <div className="flex items-center justify-center gap-6 border-t-2 py-4">
              {profile.links?.github && (
                <Link
                  href={profile.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${profile.name} on GitHub`}
                  className="inline-block transition-transform duration-100 hover:-translate-y-1"
                >
                  <Github className="h-7 w-7" />
                </Link>
              )}
              {profile.links?.linkedin && (
                <Link
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${profile.name} on LinkedIn`}
                  className="inline-block transition-transform duration-100 hover:-translate-y-1"
                >
                  <Linkedin className="h-7 w-7" />
                </Link>
              )}
            </div>
          )}

          {/* Safety and reporting link */}
          <div className="flex justify-center pb-2 pt-1">
            <ReportUserDialog reportedUser={{ id: profile.id, name: profile.name }} />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
