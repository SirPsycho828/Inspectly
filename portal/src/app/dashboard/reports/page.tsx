'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { FileText, MapPin, Search, Loader2, X, Calendar } from 'lucide-react';

const severityColors: Record<string, string> = {
  critical: 'bg-destructive/10 text-destructive',
  major: 'bg-orange-50 text-orange-700',
  minor: 'bg-warning/10 text-warning',
  informational: 'bg-blue-50 text-blue-700',
};

function formatDate(ts: any): string {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const q = query(
          collection(db, 'reports'),
          where('inspectorId', '==', user!.id),
          where('status', '==', 'active'),
          orderBy('publishedAt', 'desc')
        );
        const snap = await getDocs(q);
        setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Reports load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filtered = search.trim()
    ? reports.filter((r: any) =>
        (r.property?.address || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.property?.city || '').toLowerCase().includes(search.toLowerCase())
      )
    : reports;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-foreground">Reports</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address..."
            className="w-full rounded-md border border-input py-2 pl-10 pr-4 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:w-72"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted" />
            <p className="mt-4 text-sm font-medium text-foreground">No published reports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Published inspection reports will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((report: any) => {
              const fc = report.findingCounts || {};
              return (
                <button
                  key={report.id}
                  onClick={() => setSelected(selected?.id === report.id ? null : report)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10">
                    <FileText className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{report.property?.address}</p>
                    <p className="text-xs text-muted-foreground">{report.property?.city}, {report.property?.state}</p>
                  </div>
                  <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(report.publishedAt)}
                  </div>
                  {report.version > 1 && (
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">v{report.version}</span>
                  )}
                  <div className="hidden gap-1 md:flex">
                    {fc.critical > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors.critical}`}>{fc.critical}</span>}
                    {fc.major > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors.major}`}>{fc.major}</span>}
                    {fc.minor > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors.minor}`}>{fc.minor}</span>}
                    {fc.informational > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColors.informational}`}>{fc.informational}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail slide-over */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-foreground/50" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-card shadow-lg overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">Report Detail</h2>
              <button onClick={() => setSelected(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Property</h3>
                <p className="mt-1 text-sm font-semibold text-foreground">{selected.property?.address}</p>
                <p className="text-sm text-muted-foreground">{selected.property?.city}, {selected.property?.state} {selected.property?.zip}</p>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Inspector</h3>
                <p className="mt-1 text-sm text-foreground">{selected.inspectorName}</p>
                <p className="text-xs text-muted-foreground">License: {selected.inspectorLicense}</p>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Published</h3>
                <p className="mt-1 text-sm text-foreground">{formatDate(selected.publishedAt)}</p>
                {selected.version > 1 && <p className="text-xs text-muted-foreground">Version {selected.version}</p>}
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Findings Summary</h3>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Critical', count: selected.findingCounts?.critical || 0, color: 'text-destructive bg-destructive/10' },
                    { label: 'Major', count: selected.findingCounts?.major || 0, color: 'text-orange-600 bg-orange-50' },
                    { label: 'Minor', count: selected.findingCounts?.minor || 0, color: 'text-warning bg-warning/10' },
                    { label: 'Info', count: selected.findingCounts?.informational || 0, color: 'text-blue-600 bg-blue-50' },
                  ].map((f) => (
                    <div key={f.label} className={`rounded-md p-3 text-center ${f.color}`}>
                      <p className="text-lg font-bold">{f.count}</p>
                      <p className="text-xs font-medium">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {selected.executiveSummary && (
                <div>
                  <h3 className="font-heading text-sm font-medium text-muted-foreground">Executive Summary</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.executiveSummary}</p>
                </div>
              )}
              {selected.sections && selected.sections.length > 0 && (
                <div>
                  <h3 className="font-heading text-sm font-medium text-muted-foreground">Sections</h3>
                  <div className="mt-2 space-y-2">
                    {selected.sections.map((section: any) => (
                      <div key={section.sectionId} className="rounded-md border border-border px-4 py-3">
                        <p className="text-sm font-medium text-foreground">{section.title}</p>
                        <p className="text-xs text-muted-foreground">{section.findings?.length || 0} findings</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {selected.totalPhotos || 0} photos
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
