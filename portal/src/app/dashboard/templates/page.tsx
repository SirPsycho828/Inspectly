'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { ListChecks, Loader2, Lock } from 'lucide-react';
import { EmptyState } from '@/components/ux/EmptyState';
import { GuidanceTip } from '@/components/ux/GuidanceTip';

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'checklistTemplates'));
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });
        setTemplates(docs);
      } catch (err) {
        console.error('Templates load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function sourceLabel(t: any): { label: string; style: string } {
    if (t.ownerId === 'system') return { label: 'System', style: 'bg-blue-50 text-blue-700' };
    if (t.firmId) return { label: 'Firm', style: 'bg-success/15 text-success' };
    return { label: 'Custom', style: 'bg-accent/10 text-accent' };
  }

  function itemCount(t: any): number {
    return (t.sections || []).reduce((sum: number, s: any) => sum + (s.items?.length || 0), 0);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-700 text-foreground">Checklist Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Templates define the sections and checklist items used during an inspection. System templates are built-in; custom templates can be created from the mobile app.
        </p>
      </div>

      <GuidanceTip id="templates-overview">
        Each template contains sections (like Roof, Electrical, Plumbing) with checklist items your inspectors will follow during a walkthrough. When starting an inspection in the mobile app, you choose which template to use.
      </GuidanceTip>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          <EmptyState
            icon={<ListChecks className="h-6 w-6 text-muted-foreground" />}
            title="No templates available"
            description="System templates will appear here once configured. You can also create custom templates from the Inspectly mobile app."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t: any) => {
            const source = sourceLabel(t);
            const isSystem = t.ownerId === 'system';
            return (
              <div key={t.id} className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
                    <ListChecks className="h-5 w-5 text-accent" />
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${source.style}`}>{source.label}</span>
                </div>
                <h3 className="font-heading mt-3 text-sm font-semibold text-foreground">{t.name}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{(t.sections || []).length} sections</span>
                  <span>{itemCount(t)} items</span>
                </div>
                {t.isDefault && (
                  <span className="mt-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">Default</span>
                )}
                {isSystem && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Read-only system template
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
