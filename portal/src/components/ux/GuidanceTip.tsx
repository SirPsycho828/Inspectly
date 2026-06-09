'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, X } from 'lucide-react';

interface GuidanceTipProps {
  id: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function GuidanceTip({ id, children, icon }: GuidanceTipProps) {
  const storageKey = `ux-tip-${id}`;
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(storageKey, 'true');
    setDismissed(true);
  }

  return (
    <div className="flex items-start gap-3 rounded-md border border-accent/20 bg-accent/5 p-3 text-sm animate-fade-in">
      <span className="mt-0.5 shrink-0 text-accent">
        {icon ?? <Lightbulb className="h-4 w-4" />}
      </span>
      <p className="flex-1 text-muted-foreground">{children}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
