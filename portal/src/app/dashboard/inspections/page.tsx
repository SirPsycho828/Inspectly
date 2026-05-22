'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { ClipboardList, MapPin, Search, Loader2, X, Calendar, AlertTriangle } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/15 text-warning',
  review: 'bg-accent/10 text-accent',
  published: 'bg-success/15 text-success',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft', in_progress: 'In Progress', review: 'Review', published: 'Published',
};

const tabs = ['All', 'In Progress', 'Review', 'Published'];
const tabFilter: Record<string, string | null> = {
  'All': null, 'In Progress': 'in_progress', 'Review': 'review', 'Published': 'published',
};

function formatDate(ts: any): string {
  if (!ts) return '--';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InspectionsPage() {
  const { user } = useAuth();
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const q = query(collection(db, 'inspections'), where('inspectorId', '==', user!.id));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => {
          const at = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
          const bt = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
          return bt - at;
        });
        setInspections(docs);
      } catch (err) {
        console.error('Inspections load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filtered = inspections.filter((insp: any) => {
    const statusMatch = tabFilter[activeTab] ? insp.status === tabFilter[activeTab] : true;
    const searchMatch = search.trim()
      ? (insp.property?.address || '').toLowerCase().includes(search.toLowerCase()) ||
        (insp.clientName || '').toLowerCase().includes(search.toLowerCase())
      : true;
    return statusMatch && searchMatch;
  });

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-700 text-foreground">Inspections</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address or client..."
            className="w-full rounded-md border border-input py-2 pl-10 pr-4 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 sm:w-72"
          />
        </div>
      </div>

      <div className="flex gap-1 rounded-md bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ClipboardList className="mx-auto h-12 w-12 text-muted" />
            <p className="mt-4 text-sm font-medium text-foreground">No inspections found</p>
            <p className="mt-1 text-sm text-muted-foreground">Inspections created in the mobile app will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((insp: any) => {
              const fc = insp.findingCounts || {};
              const totalFindings = (fc.critical || 0) + (fc.major || 0) + (fc.minor || 0) + (fc.informational || 0);
              return (
                <button
                  key={insp.id}
                  onClick={() => setSelected(selected?.id === insp.id ? null : insp)}
                  className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{insp.property?.address}</p>
                    <p className="text-xs text-muted-foreground">{insp.property?.city}, {insp.property?.state} {insp.property?.zip}</p>
                  </div>
                  <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(insp.startedAt || insp.createdAt)}
                  </div>
                  {totalFindings > 0 && (
                    <div className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {totalFindings} findings
                    </div>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[insp.status] || 'bg-muted text-muted-foreground'}`}>
                    {statusLabels[insp.status] || insp.status}
                  </span>
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
          <div className="relative w-full max-w-md bg-card shadow-lg overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">Inspection Detail</h2>
              <button onClick={() => setSelected(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-6 p-6">
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Property</h3>
                <p className="mt-1 text-sm font-semibold text-foreground">{selected.property?.address}</p>
                <p className="text-sm text-muted-foreground">{selected.property?.city}, {selected.property?.state} {selected.property?.zip}</p>
                <p className="mt-1 text-xs text-muted-foreground">Type: {selected.property?.propertyType?.replace('_', ' ')}</p>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Client</h3>
                <p className="mt-1 text-sm text-foreground">{selected.clientName}</p>
                <p className="text-sm text-muted-foreground">{selected.clientEmail}</p>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Status</h3>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[selected.status]}`}>
                  {statusLabels[selected.status]}
                </span>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Checklist Progress</h3>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{selected.checklistProgress?.completed || 0} of {selected.checklistProgress?.total || 0}</span>
                    <span>{selected.checklistProgress?.total ? Math.round(((selected.checklistProgress?.completed || 0) / selected.checklistProgress.total) * 100) : 0}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-accent transition-all" style={{ width: `${selected.checklistProgress?.total ? ((selected.checklistProgress?.completed || 0) / selected.checklistProgress.total) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Findings</h3>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Critical', count: selected.findingCounts?.critical || 0, color: 'text-destructive bg-destructive/10' },
                    { label: 'Major', count: selected.findingCounts?.major || 0, color: 'text-orange-700 bg-orange-50' },
                    { label: 'Minor', count: selected.findingCounts?.minor || 0, color: 'text-warning bg-warning/10' },
                    { label: 'Info', count: selected.findingCounts?.informational || 0, color: 'text-blue-700 bg-blue-50' },
                  ].map((f) => (
                    <div key={f.label} className={`rounded-md p-3 text-center ${f.color}`}>
                      <p className="text-lg font-bold">{f.count}</p>
                      <p className="text-xs font-medium">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-heading text-sm font-medium text-muted-foreground">Dates</h3>
                <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <p>Started: {formatDate(selected.startedAt)}</p>
                  {selected.completedAt && <p>Completed: {formatDate(selected.completedAt)}</p>}
                  {selected.publishedAt && <p>Published: {formatDate(selected.publishedAt)}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
