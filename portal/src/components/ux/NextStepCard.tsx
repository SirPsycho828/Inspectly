'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface NextStepCardProps {
  title: string;
  description: string;
  href: string;
  actionLabel?: string;
  icon?: React.ReactNode;
}

export function NextStepCard({ title, description, href, actionLabel, icon }: NextStepCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border border-l-4 border-l-accent bg-card p-4 shadow-sm animate-slide-up">
      {icon && (
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/10 sm:flex">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Link
        href={href}
        className="btn-interactive inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition-all hover:brightness-110"
      >
        {actionLabel ?? title}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
