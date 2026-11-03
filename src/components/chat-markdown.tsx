'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChatMarkdownProps {
  content: string;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed:', e);
    }
  };

  const cleanLang = language ? language.replace(/language-/, '') : 'code';

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-border/80 bg-neutral-950 dark:bg-neutral-900 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-neutral-900/90 dark:bg-neutral-800/90 border-b border-border/40 text-[11px] font-mono text-muted-foreground">
        <span>{cleanLang}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 text-[11px] text-neutral-300 hover:text-white hover:bg-neutral-700/50 flex items-center gap-1"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs font-mono text-neutral-100 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ChatMarkdown({ content }: ChatMarkdownProps) {
  // Pre-process raw markdown to replace <br> / <br/> with newline for proper table & list parsing
  const formattedContent = content
    ? content.replace(/<br\s*\/?>/gi, '\n')
    : '';

  return (
    <div className="chat-markdown text-sm leading-relaxed break-words space-y-2">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ ...props }) => (
            <div className="my-3 w-full overflow-x-auto rounded-xl border border-border/80 shadow-md bg-card/60 backdrop-blur-sm">
              <table className="w-full text-left text-xs sm:text-sm border-collapse" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-muted/80 text-foreground font-semibold border-b border-border/80" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="px-3.5 py-2.5 font-bold text-foreground text-xs uppercase tracking-wider whitespace-nowrap" {...props} />
          ),
          tbody: ({ ...props }) => (
            <tbody className="divide-y divide-border/40" {...props} />
          ),
          tr: ({ ...props }) => (
            <tr className="hover:bg-muted/30 transition-colors even:bg-muted/15" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="px-3.5 py-2.5 text-foreground/90 align-top leading-relaxed text-xs sm:text-sm whitespace-pre-line" {...props} />
          ),
          h1: ({ ...props }) => (
            <h1 className="text-lg sm:text-xl font-bold mt-4 mb-2 text-foreground tracking-tight" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-base sm:text-lg font-bold mt-3 mb-1.5 text-foreground tracking-tight" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-sm sm:text-base font-semibold mt-2.5 mb-1 text-foreground" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-2 leading-relaxed last:mb-0 text-foreground/90" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-foreground/90" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-foreground/90" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-semibold text-foreground text-inherit" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-primary/60 bg-muted/30 pl-3 py-1 my-2 rounded-r-md italic text-muted-foreground text-xs sm:text-sm" {...props} />
          ),
          code: ({ inline, className, children, ...props }: any) => {
            const isInline = inline || !className;
            const codeString = String(children);

            if (isInline && !codeString.includes('\n')) {
              return (
                <code className="bg-muted/80 text-primary border border-border/50 px-1.5 py-0.5 rounded text-[12px] font-mono font-medium" {...props}>
                  {children}
                </code>
              );
            }

            return <CodeBlock code={codeString.replace(/\n$/, '')} language={className} />;
          },
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
}
