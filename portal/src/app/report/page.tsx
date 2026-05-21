'use client';

import { useState, useEffect } from 'react';
import { AccessCodeEntry } from '@/components/AccessCodeEntry';
import { ReportViewer } from '@/components/ReportViewer';
import { verifyAccessCode, getReport } from '@/lib/api';
import type { Report } from '@/types';

type ViewState =
  | { kind: 'loading' }
  | { kind: 'no-id' }
  | { kind: 'code-entry'; reportId: string; error?: string }
  | { kind: 'loading-report'; reportId: string }
  | { kind: 'report'; reportId: string; report: Report; token: string }
  | { kind: 'error'; message: string };

export default function ReportPage() {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    // Extract report ID from /r/{reportId} path
    const match = window.location.pathname.match(/^\/r\/([^/]+)/);
    if (!match) {
      setView({ kind: 'no-id' });
      return;
    }
    const reportId = match[1];

    // Check for stored session
    const stored = sessionStorage.getItem(`inspectly_token_${reportId}`);
    if (stored) {
      setView({ kind: 'loading-report', reportId });
      loadReport(reportId, stored);
    } else {
      setView({ kind: 'code-entry', reportId });
    }
  }, []);

  async function loadReport(reportId: string, token: string) {
    try {
      const { report } = await getReport(reportId, token);
      setView({ kind: 'report', reportId, report, token });
    } catch {
      // Token expired or invalid — go back to code entry
      sessionStorage.removeItem(`inspectly_token_${reportId}`);
      setView({ kind: 'code-entry', reportId, error: 'Session expired. Please re-enter your access code.' });
    }
  }

  async function handleVerify(reportId: string, code: string) {
    const { token } = await verifyAccessCode(reportId, code);
    sessionStorage.setItem(`inspectly_token_${reportId}`, token);
    setView({ kind: 'loading-report', reportId });
    await loadReport(reportId, token);
  }

  if (view.kind === 'loading' || view.kind === 'loading-report') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading report...</p>
        </div>
      </div>
    );
  }

  if (view.kind === 'no-id') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Invalid Report Link</h1>
          <p className="text-slate-500 text-sm">
            This link doesn&apos;t appear to be valid. Please check the link from your email or text message and try again.
          </p>
        </div>
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-4">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
          <p className="text-slate-500 text-sm">{view.message}</p>
        </div>
      </div>
    );
  }

  if (view.kind === 'code-entry') {
    return (
      <AccessCodeEntry
        reportId={view.reportId}
        onVerify={(code) => handleVerify(view.reportId, code)}
        initialError={view.error}
      />
    );
  }

  return (
    <ReportViewer
      report={view.report}
      reportId={view.reportId}
      token={view.token}
    />
  );
}
