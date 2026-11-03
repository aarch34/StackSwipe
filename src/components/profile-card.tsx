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
} from 'lucide-react';
import { type UserProfile } from '@/lib/data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { ReportUserDialog } from '@/components/report-user-dialog';

interface ProfileCardProps {
  profile: UserProfile;
  variant?: 'swipe' | 'dialog';
}

const ProfileSection: React.FC<{
  icon: React.ElementType;
  title: string;
  iconColor?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, iconColor = 'text-emerald-400', children }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm space-y-2.5 transition-colors hover:border-white/15">
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/10">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </div>
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
        {title}
      </h3>
    </div>
    <div className="pl-8 space-y-2 text-sm text-slate-300">
      {children}
    </div>
  </div>
);

export function ProfileCard({ profile, variant = 'swipe' }: ProfileCardProps) {
  const photo = profile.photoURL;
  const isDialog = variant === 'dialog';

  if (isDialog) {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-slate-950 text-slate-100">
        {/* Fixed Hero Header with Photo & Gradient */}
        <div className="relative h-[250px] sm:h-[270px] w-full flex-shrink-0 overflow-hidden bg-slate-900">
          {photo ? (
            <Image
              src={photo}
              alt={profile.name}
              fill
              priority
              sizes="(max-width: 640px) 94vw, 512px"
              className="object-cover object-top transition-transform duration-500 hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-center">
              <span className="text-6xl font-extrabold text-white/20 select-none">
                {profile.name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}

          {/* Vignette & Fade Gradients */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 via-45% to-transparent pointer-events-none" />

          {/* Profile Name & Badges on Header */}
          <div className="absolute inset-0 flex flex-col justify-end p-5 text-white">
            {/* Connection badge */}
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 backdrop-blur-md shadow-sm w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected Match
            </div>

            <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              {profile.name}
              {profile.age && (
                <span className="ml-2 text-lg font-normal text-slate-300">
                  {profile.age}
                </span>
              )}
            </h1>

            {profile.headline && (
              <p className="mt-0.5 line-clamp-1 text-sm font-medium text-slate-200 drop-shadow">
                {profile.headline}
              </p>
            )}

            {/* Quick Metadata Chips */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {(profile.jobTitle || profile.company) && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-xs text-slate-200 backdrop-blur-md">
                  <Briefcase className="h-3 w-3 text-emerald-400" />
                  {profile.jobTitle || profile.experienceLevel || 'Developer'}
                  {profile.company ? ` @ ${profile.company}` : ''}
                </span>
              )}

              {profile.location && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-xs text-slate-200 backdrop-blur-md">
                  <MapPin className="h-3 w-3 text-sky-400" />
                  {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Profile Details */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-3.5">
            {/* About Me */}
            {profile.bio && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 border border-white/10">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    About
                  </h3>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed pl-8 font-normal">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Looking For / Networking Goals */}
            {profile.networkingTags && profile.networkingTags.length > 0 && (
              <ProfileSection icon={Heart} title="Looking For" iconColor="text-pink-400">
                <div className="flex flex-wrap gap-1.5">
                  {profile.networkingTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 shadow-sm"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            )}

            {/* Work & Current Experience */}
            {(profile.company || profile.experienceLevel || profile.currentWork) && (
              <ProfileSection icon={Briefcase} title="Work Experience" iconColor="text-amber-400">
                <p className="font-medium text-slate-100">
                  <span className="font-semibold text-white">
                    {profile.jobTitle || profile.experienceLevel}
                  </span>
                  {profile.company ? (
                    <>
                      {' '}at{' '}
                      <span className="font-semibold text-emerald-400">
                        {profile.company}
                      </span>
                    </>
                  ) : null}
                </p>
                {profile.currentWork && (
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    {profile.currentWork}
                  </p>
                )}
              </ProfileSection>
            )}

            {/* Education */}
            {profile.college && (
              <ProfileSection icon={GraduationCap} title="Education" iconColor="text-indigo-400">
                <p className="font-medium text-slate-200">{profile.college}</p>
              </ProfileSection>
            )}

            {/* Tech Stack */}
            {profile.techStack && profile.techStack.length > 0 && (
              <ProfileSection icon={Code} title="My Tech Stack" iconColor="text-sky-400">
                <div className="flex flex-wrap gap-1.5">
                  {profile.techStack.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-xs font-mono font-medium text-sky-300 shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <ProfileSection icon={Sparkles} title="Interests" iconColor="text-purple-400">
                <div className="flex flex-wrap gap-1.5">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300 shadow-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </ProfileSection>
            )}

            {/* Social Links */}
            {(profile.links?.github || profile.links?.linkedin) && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Social Profiles
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {profile.links?.github && (
                    <Link
                      href={profile.links.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-white/30 hover:bg-white/10 hover:text-white transition-all shadow-sm"
                    >
                      <Github className="h-4 w-4 text-white" />
                      <span>GitHub</span>
                    </Link>
                  )}
                  {profile.links?.linkedin && (
                    <Link
                      href={profile.links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-medium text-sky-200 hover:border-sky-500/50 hover:bg-sky-500/20 transition-all shadow-sm"
                    >
                      <Linkedin className="h-4 w-4 text-sky-400" />
                      <span>LinkedIn</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Action Bottom Bar */}
        <div className="border-t border-white/10 bg-slate-950/90 p-4 backdrop-blur-lg">
          <DialogClose asChild>
            <Button
              className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Message {profile.name?.split(' ')[0] || 'Match'}
            </Button>
          </DialogClose>
        </div>
      </div>
    );
  }

  // Original swipe card layout
  return (
    <Card className="w-full max-w-sm rounded-3xl shadow-xl h-full overflow-hidden flex flex-col border border-white/10 bg-slate-950 text-slate-100">
      <ScrollArea className="flex-1">
        <div className="relative h-[480px] w-full group">
          {photo ? (
            <Image
              src={photo}
              alt={profile.name}
              fill
              className="object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-t from-black via-gray-900 to-gray-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
            <h1 className="font-headline text-3xl font-extrabold">{profile.name}, {profile.age}</h1>
            <p className="text-sm text-neutral-300">{profile.headline}</p>
          </div>
        </div>

        <div className="p-6 bg-slate-950 text-slate-100 flex-1 space-y-4">
          {profile.bio && (
            <div className="border-b border-white/10 pb-4">
              <h2 className="font-semibold text-lg mb-2 text-white">About Me</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {profile.networkingTags && profile.networkingTags.length > 0 && (
            <ProfileSection icon={Heart} title="Looking For" iconColor="text-pink-400">
              <div className="flex flex-wrap gap-2">
                {profile.networkingTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    {tag}
                  </Badge>
                ))}
              </div>
            </ProfileSection>
          )}

          <ProfileSection icon={Briefcase} title="Work" iconColor="text-amber-400">
            <p>
              <span className="font-semibold text-white">{profile.experienceLevel}</span> at{' '}
              <span className="font-semibold text-emerald-400">{profile.company || 'Not specified'}</span>
            </p>
            {profile.currentWork && <p className="text-xs text-slate-300 mt-1">{profile.currentWork}</p>}
          </ProfileSection>

          {profile.college && (
            <ProfileSection icon={GraduationCap} title="Education" iconColor="text-indigo-400">
              <p className="text-slate-200">{profile.college}</p>
            </ProfileSection>
          )}

          {profile.location && (
            <ProfileSection icon={MapPin} title="Location" iconColor="text-sky-400">
              <p className="text-slate-200">{profile.location}</p>
            </ProfileSection>
          )}

          {profile.techStack && profile.techStack.length > 0 && (
            <ProfileSection icon={Code} title="My Stack" iconColor="text-sky-400">
              <div className="flex flex-wrap gap-2">
                {profile.techStack.map((skill) => (
                  <Badge key={skill} variant="outline" className="border-sky-500/30 text-sky-300 bg-sky-500/10 font-mono text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </ProfileSection>
          )}

          {profile.interests && profile.interests.length > 0 && (
            <ProfileSection icon={Sparkles} title="Interests" iconColor="text-purple-400">
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 text-xs">
                    {interest}
                  </Badge>
                ))}
              </div>
            </ProfileSection>
          )}

          {(profile.links?.github || profile.links?.linkedin) && (
            <div className="py-4 flex items-center justify-center gap-6 border-t border-white/10">
              {profile.links?.github && (
                <Link
                  href={profile.links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <Github className="h-6 w-6" />
                </Link>
              )}
              {profile.links?.linkedin && (
                <Link
                  href={profile.links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-sky-400 transition-colors"
                >
                  <Linkedin className="h-6 w-6" />
                </Link>
              )}
            </div>
          )}

          {/* Safety & Reporting Link */}
          <div className="pt-2 pb-4 flex justify-center">
            <ReportUserDialog reportedUser={{ id: profile.id, name: profile.name }} />
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
}
