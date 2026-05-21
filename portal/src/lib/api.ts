const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export async function verifyAccessCode(reportId: string, code: string): Promise<{ token: string }> {
  const res = await fetch(`${API_BASE}/portal/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId, code }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Verification failed');
  }
  return res.json();
}

export async function getReport(reportId: string, token: string): Promise<{ report: import('../types').Report }> {
  const res = await fetch(`${API_BASE}/portal/report/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error('Failed to load report');
  }
  return res.json();
}

export async function getPdfUrl(reportId: string, token: string): Promise<{ url: string } | { retryAfter: number }> {
  const res = await fetch(`${API_BASE}/portal/report/${reportId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 202) {
    const data = await res.json();
    return { retryAfter: data.retryAfter || 10 };
  }
  if (!res.ok) throw new Error('PDF unavailable');
  return res.json();
}
