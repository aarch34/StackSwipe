'use client';

import { useId, useState } from 'react';
import { Plus, X } from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TagPickerProps {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
  customPlaceholder?: string;
  allowCustom?: boolean;
}

/** Multi-select chips with an optional box for adding your own. */
export function TagPicker({
  options,
  value,
  onChange,
  customPlaceholder = 'Add your own',
  allowCustom = true,
}: TagPickerProps) {
  const inputId = useId();
  const [custom, setCustom] = useState('');
  const customTags = value.filter((tag) => !options.includes(tag));

  const toggle = (tag: string) =>
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);

  const addCustom = () => {
    const tag = custom.trim();
    if (!tag) return;
    if (!value.some((item) => item.toLowerCase() === tag.toLowerCase())) onChange([...value, tag]);
    setCustom('');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(option)}
              className={cn(
                'border-2 px-3 py-1.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'bg-accent text-accent-foreground' : 'bg-card text-foreground hover:bg-muted'
              )}
            >
              {option}
            </button>
          );
        })}

        {customTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            aria-label={`Remove ${tag}`}
            className="inline-flex items-center gap-1.5 border-2 bg-accent px-3 py-1.5 text-left text-sm font-medium text-accent-foreground"
          >
            {tag}
            <X className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {allowCustom && (
        <div className="flex gap-2">
          <label htmlFor={inputId} className="sr-only">
            {customPlaceholder}
          </label>
          <Input
            id={inputId}
            value={custom}
            placeholder={customPlaceholder}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
            }}
            className="h-10 text-sm"
          />
          <Button type="button" variant="outline" className="h-10 shrink-0" disabled={!custom.trim()} onClick={addCustom}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
