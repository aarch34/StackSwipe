'use client';

import { useEffect, useState } from 'react';
import { SlidersHorizontal } from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  CONNECTION_INTENTS,
  EMPTY_FILTERS,
  countActiveFilters,
  type ConnectionIntent,
  type DiscoveryFilters,
} from '@/lib/discovery';
import { EXPERIENCE_LEVELS } from '@/lib/guidance';

type TextField = {
  [K in keyof DiscoveryFilters]: DiscoveryFilters[K] extends string ? K : never;
}[keyof DiscoveryFilters];

const PROFESSIONAL_FIELDS: { field: TextField; label: string; placeholder: string }[] = [
  { field: 'location', label: 'Location', placeholder: 'e.g., Bengaluru' },
  { field: 'company', label: 'Company', placeholder: 'e.g., Google' },
  { field: 'college', label: 'College / University', placeholder: 'e.g., IIT Delhi' },
  { field: 'role', label: 'Current role', placeholder: 'e.g., Software Engineer, Student' },
  { field: 'industry', label: 'Industry', placeholder: 'e.g., Fintech' },
];

const LEARNING_FIELDS: { field: TextField; label: string; placeholder: string }[] = [
  { field: 'canHelpWith', label: 'Skills and topics they can help with', placeholder: 'e.g., Python, Career guidance' },
  { field: 'learning', label: 'Skills they are learning', placeholder: 'e.g., React, System design' },
  { field: 'guidanceWanted', label: 'Topics they want guidance on', placeholder: 'e.g., Interviews, Portfolio' },
];

function GroupHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="border-b-2 pb-1 font-label text-xs">{children}</h3>;
}

interface DiscoveryFiltersSheetProps {
  filters: DiscoveryFilters;
  goalOptions: string[];
  onApply: (filters: DiscoveryFilters) => void;
}

export function DiscoveryFiltersSheet({ filters, goalOptions, onApply }: DiscoveryFiltersSheetProps) {
  const [draft, setDraft] = useState(filters);
  const active = countActiveFilters(filters);

  useEffect(() => setDraft(filters), [filters]);

  const setField = (field: TextField, value: string) => setDraft((prev) => ({ ...prev, [field]: value }));

  const toggleIntent = (intent: ConnectionIntent, checked: boolean) =>
    setDraft((prev) => ({
      ...prev,
      intents: checked ? [...prev.intents, intent] : prev.intents.filter((item) => item !== intent),
    }));

  const toggleGoal = (goal: string, checked: boolean) =>
    setDraft((prev) => ({
      ...prev,
      networkingGoals: checked
        ? [...prev.networkingGoals, goal]
        : prev.networkingGoals.filter((item) => item !== goal),
    }));

  const renderTextField = ({ field, label, placeholder }: (typeof PROFESSIONAL_FIELDS)[number]) => (
    <div key={field}>
      <Label htmlFor={`filter-${field}`}>{label}</Label>
      <Input
        id={`filter-${field}`}
        placeholder={placeholder}
        value={draft[field]}
        onChange={(e) => setField(field, e.target.value)}
      />
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
          {active > 0 && <span className="ml-2 border-2 bg-accent px-1.5 text-xs text-accent-foreground">{active}</span>}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="p-6">
          <SheetTitle className="flex items-center gap-2 font-headline">
            <SlidersHorizontal /> Filters
          </SheetTitle>
          <SheetDescription>Mix and match to find the conversations you are after.</SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 px-6 pb-6">
            <section className="space-y-3">
              <GroupHeading>Who you want to talk to</GroupHeading>
              {CONNECTION_INTENTS.map((intent) => (
                <div key={intent.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`intent-${intent.id}`}
                    checked={draft.intents.includes(intent.id)}
                    onCheckedChange={(checked) => toggleIntent(intent.id, !!checked)}
                  />
                  <label htmlFor={`intent-${intent.id}`} className="cursor-pointer text-sm font-medium">
                    {intent.label}
                  </label>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <GroupHeading>What they know and are learning</GroupHeading>
              {LEARNING_FIELDS.map(renderTextField)}
            </section>

            <section className="space-y-3">
              <GroupHeading>Background</GroupHeading>
              {PROFESSIONAL_FIELDS.map(renderTextField)}
              <div>
                <Label htmlFor="filter-experience">Experience level</Label>
                <Select
                  value={draft.experienceLevel || 'any'}
                  onValueChange={(value) => setField('experienceLevel', value)}
                >
                  <SelectTrigger id="filter-experience">
                    <SelectValue placeholder="Any experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any experience level</SelectItem>
                    {EXPERIENCE_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {goalOptions.length > 0 && (
              <section className="space-y-3">
                <GroupHeading>Also up for</GroupHeading>
                {goalOptions.map((goal, index) => (
                  <div key={goal} className="flex items-center gap-2">
                    <Checkbox
                      id={`filter-goal-${index}`}
                      checked={draft.networkingGoals.includes(goal)}
                      onCheckedChange={(checked) => toggleGoal(goal, !!checked)}
                    />
                    <label htmlFor={`filter-goal-${index}`} className="cursor-pointer text-sm font-medium">
                      {goal}
                    </label>
                  </div>
                ))}
              </section>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="gap-2 border-t p-6">
          <SheetClose asChild>
            <Button variant="outline" onClick={() => onApply(EMPTY_FILTERS)}>
              Clear all
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button onClick={() => onApply(draft)}>Apply filters</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
