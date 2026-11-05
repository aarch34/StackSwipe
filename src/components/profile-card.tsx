'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Code,
  Github,
  GraduationCap,
  Heart,
  Lightbulb,
  Linkedin,
  MapPin,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from '@/components/px-icons';
import { type UserProfile } from '@/lib/data';
import type { DiscoveryLabel } from '@/lib/discovery';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { DialogClose } from '@/components/ui/dialog';
import { ReportUserDialog } from '@/components/report-user-dialog';
import { BlockUserAction } from '@/components/safety-actions';
import { PixelImage } from '@/components/pixel/pixel-image';

interface ProfileCardProps {
  profile: UserProfile;
  variant?: 'swipe' | 'dialog';
  labels?: DiscoveryLabel[];
  onBlocked?: () => void;
}

const NAME_PLATE = 'bg-[color:var(--c-ink)] text-[color:var(--c-cream)]';
const HELP_TILE = 'border-2 bg-accent px-2 py-1 text-xs font-medium text-accent-foreground';
const LEARN_TILE = 'border-2 bg-primary px-2 py-1 text-xs font-medium text-primary-foreground';
const PLAIN_TILE = 'border-2 bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground';
const MAX_TILES_ON_CARD = 4;

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

function TopicRow({
  title,
  topics,
  tile,
  limit,
}: {
  title: string;
  topics?: string[];
  tile: string;
  limit?: number;
}) {
  const clean = (topics ?? []).filter(Boolean);
  if (!clean.length) return null;

  const visible = limit ? clean.slice(0, limit) : clean;
  const hidden = clean.length - visible.length;

  return (
    <div>
      <h3 className="mb-1.5 font-label text-[11px]">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((topic) => (
          <span key={topic} className={tile}>
            {topic}
          </span>
        ))}
        {hidden > 0 && <span className="px-1 py-1 text-xs font-medium text-muted-foreground">+{hidden} more</span>}
      </div>
    </div>
  );
}

function GuidanceSections({ profile, limit }: { profile: UserProfile; limit?: number }) {
  return (
    <>
      <TopicRow title="Can help with" topics={profile.canHelpWith} tile={HELP_TILE} limit={limit} />
      <TopicRow title="Currently learning" topics={profile.currentlyLearning} tile={LEARN_TILE} limit={limit} />
      <TopicRow title="Looking for guidance on" topics={profile.guidanceWanted} tile={PLAIN_TILE} limit={limit} />
      <TopicRow title="Open to" topics={profile.conversationPreferences} tile={PLAIN_TILE} limit={limit} />
    </>
  );
}

function ProfileLinks({ profile }: { profile: UserProfile }) {
  if (!profile.links?.github && !profile.links?.linkedin) return null;

  return (
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
  );
}

/** Everything beyond the essentials, shared by the expanded swipe card and the profile dialog. */
function ProfileDetails({ profile }: { profile: UserProfile }) {
  const role = profile.jobTitle || profile.currentWork;

  return (
    <div className="space-y-3">
      {profile.bio && (
        <ProfileSection icon={Sparkles} title="About">
          <p className="leading-relaxed">{profile.bio}</p>
        </ProfileSection>
      )}

      {(role || profile.company || profile.industry) && (
        <ProfileSection icon={Briefcase} title="Work">
          {role && <p className="font-semibold">{role}</p>}
          {profile.company && <p>{profile.company}</p>}
          {profile.industry && <p className="text-xs text-muted-foreground">{profile.industry}</p>}
        </ProfileSection>
      )}

      {profile.college && (
        <ProfileSection icon={GraduationCap} title="Education">
          <p>{profile.college}</p>
        </ProfileSection>
      )}

      {profile.techStack?.filter(Boolean).length > 0 && (
        <ProfileSection icon={Code} title="Skills and tools">
          <div className="flex flex-wrap gap-1.5">
            {profile.techStack.filter(Boolean).map((skill) => (
              <span key={skill} className={PLAIN_TILE}>
                {skill}
              </span>
            ))}
          </div>
        </ProfileSection>
      )}

      {profile.interests?.filter(Boolean).length > 0 && (
        <ProfileSection icon={Lightbulb} title="Interests">
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.filter(Boolean).map((interest) => (
              <span key={interest} className={PLAIN_TILE}>
                {interest}
              </span>
            ))}
          </div>
        </ProfileSection>
      )}

      {profile.networkingTags?.filter(Boolean).length > 0 && (
        <ProfileSection icon={Heart} title="Also up for">
          <div className="flex flex-wrap gap-1.5">
            {profile.networkingTags.filter(Boolean).map((tag) => (
              <span key={tag} className={PLAIN_TILE}>
                {tag}
              </span>
            ))}
          </div>
        </ProfileSection>
      )}

      <ProfileLinks profile={profile} />
    </div>
  );
}

function subtitle(profile: UserProfile) {
  return [profile.jobTitle || profile.currentWork, profile.company].filter(Boolean).join(' · ');
}

function placeLine(profile: UserProfile) {
  return [profile.location, profile.experienceLevel].filter(Boolean).join(' · ');
}

export function ProfileCard({ profile, variant = 'swipe', labels = [], onBlocked }: ProfileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const photo = profile.photoURL;
  const firstName = profile.name?.split(' ')[0] || 'them';

  if (variant === 'dialog') {
    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-card text-card-foreground">
        <div className="relative h-[220px] w-full flex-shrink-0 overflow-hidden bg-muted sm:h-[250px]">
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
            <div className="absolute inset-0 flex items-start justify-center bg-secondary pt-6">
              <span className="select-none font-headline text-7xl font-bold">
                {profile.name?.charAt(0) ?? '?'}
              </span>
            </div>
          )}

          <div className={`absolute inset-x-0 bottom-0 p-4 ${NAME_PLATE}`}>
            <h2 className="font-headline text-4xl font-bold leading-none">{profile.name}</h2>
            {subtitle(profile) && <p className="mt-1 line-clamp-1 text-sm">{subtitle(profile)}</p>}
            {placeLine(profile) && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs">
                <MapPin className="h-4 w-4" />
                {placeLine(profile)}
              </p>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4">
            {profile.headline && <p className="text-sm font-medium">{profile.headline}</p>}
            <GuidanceSections profile={profile} />
            <ProfileDetails profile={profile} />
          </div>
        </ScrollArea>

        <div className="border-t-2 bg-card p-4">
          <DialogClose asChild>
            <Button className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message {firstName}
            </Button>
          </DialogClose>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col bg-card text-card-foreground">
      <div className="relative h-52 w-full flex-shrink-0 bg-muted">
        {photo ? (
          <PixelImage
            src={photo}
            alt={profile.name}
            fill
            sizes="(max-width: 640px) 94vw, 384px"
            className="object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 flex items-start justify-center bg-secondary pt-6">
            <span className="select-none font-headline text-7xl font-bold">
              {profile.name?.charAt(0) ?? '?'}
            </span>
          </div>
        )}
        <div className={`absolute inset-x-0 bottom-0 px-4 py-3 ${NAME_PLATE}`}>
          <h2 className="font-headline text-4xl font-bold leading-none">{profile.name}</h2>
          {subtitle(profile) && <p className="mt-1 line-clamp-1 text-sm">{subtitle(profile)}</p>}
          {placeLine(profile) && <p className="line-clamp-1 text-xs opacity-90">{placeLine(profile)}</p>}
        </div>
      </div>

      <div className="space-y-3 p-4">
        {labels.length > 0 && (
          <ul className="space-y-1.5" aria-label="Why you might want to talk">
            {labels.slice(0, 2).map((label) => (
              <li
                key={label.id}
                className="flex items-start gap-1.5 border-2 bg-[color:var(--c-leaf)] px-2 py-1 text-xs font-semibold text-[color:var(--c-ink)]"
              >
                <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  {label.text}
                  {label.detail ? `: ${label.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}

        {profile.headline && <p className="text-sm font-medium">{profile.headline}</p>}

        <GuidanceSections profile={profile} limit={MAX_TILES_ON_CARD} />

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          aria-expanded={expanded}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
          {expanded ? 'Show less' : `More about ${firstName}`}
        </Button>

        {expanded && (
          <div className="animate-step-in space-y-3">
            <ProfileDetails profile={profile} />
            <div className="flex items-center justify-center gap-1 border-t-2 pt-2">
              <ReportUserDialog reportedUser={{ id: profile.id, name: profile.name }} />
              <BlockUserAction user={{ id: profile.id, name: profile.name }} onDone={onBlocked} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
