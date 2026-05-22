'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { ClipboardList, FileText, Clock, CalendarDays, MapPin, Loader2, ArrowRight } from 'lucide-react';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/15 text-warning',
  review: 'bg-accent/10 text-accent',
  published: 'bg-success/15 text-success',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  review: 'Review',
  published: 'Published',
};

function formatDate(ts: any): string {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, published: 0, inProgress: 0, thisMonth: 0 });
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const q = query(collection(db, 'inspections'), where('inspectorId', '==', user!.id));
        const snap = await getDocs(q);
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        setStats({
          total: docs.length,
          published: docs.filter((d: any) => d.status === 'published').length,
          inProgress: docs.filter((d: any) => d.status === 'in_progress').length,
          thisMonth: docs.filter((d: any) => {
            const created = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt);
            return created >= monthStart;
          }).length,
        });

        const sorted = docs.sort((a: any, b: any) => {
          const aTime = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
          const bTime = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
          return bTime - aTime;
        });
        setRecentInspections(sorted.slice(0, 5));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const statCards = [
    { label: 'Total Inspections', value: stats.total, icon: ClipboardList, color: 'bg-accent/10 text-accent' },
    { label: 'Published Reports', value: stats.published, icon: FileText, color: 'bg-success/15 text-success' },
    { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'bg-warning/15 text-warning' },
    { label: 'This Month', value: stats.thisMonth, icon: CalendarDays, color: 'bg-muted text-muted-foreground' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-700 text-foreground">Welcome back, {user?.displayName?.split(' ')[0]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here is an overview of your inspection activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${s.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-600 text-foreground">Recent Inspections</h2>
          <Link href="/dashboard/inspections" className="flex items-center gap-1 text-sm font-medium text-accent hover:text-accent">
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recentInspections.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No inspections yet. Start your first inspection from the mobile app.</div>
        ) : (
          <div className="divide-y divide-border">
            {recentInspections.map((insp: any) => (
              <div key={insp.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{insp.property?.address}</p>
                  <p className="text-xs text-muted-foreground">{insp.property?.city}, {insp.property?.state}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[insp.status] || 'bg-muted text-muted-foreground'}`}>
                  {statusLabels[insp.status] || insp.status}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(insp.updatedAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
