'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { verifyAccessCode, getReport } from '@/lib/api';
import type { Report } from '@/types';
import { AccessCodeEntry } from '@/components/AccessCodeEntry';
import { ReportViewer } from '@/components/ReportViewer';

export default function ReportPage() {
  const params = useParams();
  const reportId = params?.id as string;
  const [token, setToken] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem(`inspectly_token_${reportId}`);
    if (saved) {
      setToken(saved);
      loadReport(saved);
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function loadReport(t: string) {
    try {
      const { report: r } = await getReport(reportId, t);
      setReport(r);
    } catch {
      sessionStorage.removeItem(`inspectly_token_${reportId}`);
      setToken(null);
      setError('Session expired. Please enter your access code again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(code: string) {
    setError('');
    const { token: t } = await verifyAccessCode(reportId, code);
    sessionStorage.setItem(`inspectly_token_${reportId}`, t);
    setToken(t);
    await loadReport(t);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || !report) {
    return <AccessCodeEntry reportId={reportId} onVerify={handleVerify} initialError={error} />;
  }

  return <ReportViewer report={report} reportId={reportId} token={token} />;
}
