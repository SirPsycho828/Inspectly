'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Download,
  ChevronUp,
  ChevronDown,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  MapPin,
  Calendar,
  User,
  FileText,
  ArrowUp,
} from 'lucide-react';
import type { Report, ReportSection, ReportFinding } from '@/types';
import { SeverityBadge } from './SeverityBadge';
import { severityConfig } from '@/lib/severity';
import { getPdfUrl } from '@/lib/api';

interface ReportViewerProps {
  report: Report;
  reportId: string;
  token: string;
}

interface LightboxState {
  photos: { url: string; caption: string }[];
  index: number;
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ state, onClose }: { state: LightboxState; onClose: () => void }) {
  const [idx, setIdx] = useState(state.index);
  const total = state.photos.length;

  const prev = useCallback(() => setIdx(i => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIdx(i => (i + 1) % total), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const photo = state.photos[idx];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
        {idx + 1} / {total}
      </div>

      {/* Image */}
      <div
        className="max-w-5xl w-full px-16 flex items-center justify-center"
        onClick={e => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption}
          className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
        />
      </div>

      {/* Caption */}
      {photo.caption && (
        <div className="mt-4 text-white/70 text-sm text-center max-w-lg px-4">
          {photo.caption}
        </div>
      )}

      {/* Navigation */}
      {total > 1 && (
        <>
          <button
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={e => { e.stopPropagation(); prev(); }}
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            onClick={e => { e.stopPropagation(); next(); }}
            aria-label="Next photo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
    </div>
  );
}

// ─── Severity Bar Chart ───────────────────────────────────────────────────────

function SeverityBarChart({ counts }: { counts: Report['findingCounts'] }) {
  const total = counts.critical + counts.major + counts.minor + counts.informational;
  if (total === 0) return null;

  const segments: { key: keyof typeof counts; label: string; color: string }[] = [
    { key: 'critical', label: 'Critical', color: '#EF4444' },
    { key: 'major', label: 'Major', color: '#F97316' },
    { key: 'minor', label: 'Minor', color: '#EAB308' },
    { key: 'informational', label: 'Info', color: '#3B82F6' },
  ];

  return (
    <div>
      {/* Stacked bar */}
      <div className="flex rounded-full overflow-hidden h-4 mb-4" role="img" aria-label="Severity distribution">
        {segments.map(s => {
          const pct = (counts[s.key] / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={s.key}
              style={{ width: `${pct}%`, backgroundColor: s.color }}
              title={`${s.label}: ${counts[s.key]}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {segments.map(s => (
          <div key={s.key} className="flex items-center gap-1.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-slate-600">{s.label}</span>
            <span className="font-semibold text-slate-900">{counts[s.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Finding Card ─────────────────────────────────────────────────────────────

function FindingCard({
  finding,
  onPhotoClick,
}: {
  finding: ReportFinding;
  onPhotoClick: (photos: { url: string; caption: string }[], index: number) => void;
}) {
  const cfg = severityConfig[finding.severity];

  return (
    <div
      className="rounded-xl border bg-white overflow-hidden"
      style={{ borderColor: cfg.border }}
    >
      {/* Finding header */}
      <div className="px-5 py-4 flex flex-wrap items-start gap-3" style={{ backgroundColor: cfg.bg }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={finding.severity} />
            <h4 className="font-semibold text-slate-900 text-sm">{finding.component}</h4>
          </div>
          <p className="text-slate-600 text-sm">{finding.condition}</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Narrative */}
        <p className="text-slate-700 text-sm leading-relaxed">{finding.narrative}</p>

        {/* Recommendation */}
        {finding.recommendation && (
          <div className="border-l-4 pl-4 py-1" style={{ borderColor: cfg.color }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: cfg.color }}>
              Recommendation
            </p>
            <p className="text-slate-600 text-sm italic leading-relaxed">{finding.recommendation}</p>
          </div>
        )}

        {/* Photos */}
        {finding.photos.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
              Photos ({finding.photos.length})
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {finding.photos.map((photo, i) => (
                <button
                  key={i}
                  onClick={() => onPhotoClick(finding.photos, i)}
                  className="aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-teal-400 hover:ring-2 hover:ring-teal-200 transition-all focus:outline-none focus:ring-2 focus:ring-teal-400"
                  aria-label={`View photo: ${photo.caption || `Photo ${i + 1}`}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section Block ─────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  primaryColor,
  onPhotoClick,
}: {
  section: ReportSection;
  primaryColor: string;
  onPhotoClick: (photos: { url: string; caption: string }[], index: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const totalFindings = section.findings.length;
  const criticalCount = section.findings.filter(f => f.severity === 'critical').length;
  const majorCount = section.findings.filter(f => f.severity === 'major').length;

  return (
    <section id={`section-${section.sectionId}`} className="scroll-mt-20">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl text-left mb-3 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-400"
        style={{ backgroundColor: primaryColor }}
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-bold text-white text-lg">{section.title}</span>
          <span className="text-white/70 text-sm">{totalFindings} finding{totalFindings !== 1 ? 's' : ''}</span>
          {criticalCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {criticalCount} critical
            </span>
          )}
          {majorCount > 0 && (
            <span className="bg-orange-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {majorCount} major
            </span>
          )}
        </div>
        {collapsed ? (
          <ChevronDown className="w-5 h-5 text-white/80 flex-shrink-0" />
        ) : (
          <ChevronUp className="w-5 h-5 text-white/80 flex-shrink-0" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-4 pl-2">
          {section.findings.length === 0 ? (
            <p className="text-slate-400 text-sm italic px-3">No findings in this section.</p>
          ) : (
            section.findings.map((finding, i) => (
              <FindingCard key={i} finding={finding} onPhotoClick={onPhotoClick} />
            ))
          )}
        </div>
      )}
    </section>
  );
}

// ─── Table of Contents ────────────────────────────────────────────────────────

function TableOfContents({
  sections,
  primaryColor,
  activeSection,
}: {
  sections: ReportSection[];
  primaryColor: string;
  activeSection: string | null;
}) {
  function scrollTo(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav className="space-y-1" aria-label="Table of contents">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-3">
        Sections
      </p>
      {sections.map(s => {
        const critCount = s.findings.filter(f => f.severity === 'critical').length;
        const majCount = s.findings.filter(f => f.severity === 'major').length;
        const isActive = activeSection === s.sectionId;
        return (
          <button
            key={s.sectionId}
            onClick={() => scrollTo(s.sectionId)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between gap-2 ${
              isActive
                ? 'font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            style={isActive ? { backgroundColor: `${primaryColor}15`, color: primaryColor } : {}}
          >
            <span className="truncate">{s.title}</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              {critCount > 0 && (
                <span className="w-4 h-4 bg-red-100 text-red-600 text-xs rounded-full flex items-center justify-center font-bold">
                  {critCount}
                </span>
              )}
              {majCount > 0 && (
                <span className="w-4 h-4 bg-orange-100 text-orange-600 text-xs rounded-full flex items-center justify-center font-bold">
                  {majCount}
                </span>
              )}
              {critCount === 0 && majCount === 0 && s.findings.length > 0 && (
                <span className="text-slate-300 text-xs">{s.findings.length}</span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── Summary Table ─────────────────────────────────────────────────────────────

function SummaryTable({ sections }: { sections: ReportSection[] }) {
  function scrollTo(sectionId: string) {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 font-semibold text-slate-700">Section</th>
            <th className="text-center px-3 py-3 font-semibold text-red-600">Critical</th>
            <th className="text-center px-3 py-3 font-semibold text-orange-500">Major</th>
            <th className="text-center px-3 py-3 font-semibold text-yellow-600">Minor</th>
            <th className="text-center px-3 py-3 font-semibold text-blue-500">Info</th>
            <th className="text-center px-3 py-3 font-semibold text-slate-500">Total</th>
          </tr>
        </thead>
        <tbody>
          {sections.map((s, i) => {
            const counts = {
              critical: s.findings.filter(f => f.severity === 'critical').length,
              major: s.findings.filter(f => f.severity === 'major').length,
              minor: s.findings.filter(f => f.severity === 'minor').length,
              informational: s.findings.filter(f => f.severity === 'informational').length,
            };
            const total = s.findings.length;
            return (
              <tr
                key={s.sectionId}
                className={`border-b border-slate-100 cursor-pointer hover:bg-teal-50 transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                }`}
                onClick={() => scrollTo(s.sectionId)}
              >
                <td className="px-4 py-3 font-medium text-slate-800 hover:text-teal-700">{s.title}</td>
                <td className="text-center px-3 py-3">
                  {counts.critical > 0 ? (
                    <span className="font-bold text-red-600">{counts.critical}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  {counts.major > 0 ? (
                    <span className="font-bold text-orange-500">{counts.major}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  {counts.minor > 0 ? (
                    <span className="font-bold text-yellow-600">{counts.minor}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="text-center px-3 py-3">
                  {counts.informational > 0 ? (
                    <span className="font-bold text-blue-500">{counts.informational}</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="text-center px-3 py-3 font-semibold text-slate-700">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── PDF Download Button ──────────────────────────────────────────────────────

function PdfDownloadButton({ reportId, token }: { reportId: string; token: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'retry' | 'error'>('idle');
  const [retryCountdown, setRetryCountdown] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleDownload() {
    if (state === 'loading') return;
    setState('loading');
    try {
      const result = await getPdfUrl(reportId, token);
      if ('retryAfter' in result) {
        setState('retry');
        setRetryCountdown(result.retryAfter);
        const tick = (s: number) => {
          if (s <= 0) { setState('idle'); return; }
          setRetryCountdown(s);
          retryTimerRef.current = setTimeout(() => tick(s - 1), 1000);
        };
        tick(result.retryAfter);
      } else {
        // Open PDF in new tab
        window.open(result.url, '_blank', 'noopener,noreferrer');
        setState('idle');
      }
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  if (state === 'retry') {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        PDF generating… {retryCountdown}s
      </button>
    );
  }

  if (state === 'error') {
    return (
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium cursor-not-allowed"
      >
        <X className="w-4 h-4" />
        PDF unavailable
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={state === 'loading'}
      className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
    >
      {state === 'loading' ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Loading…
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Download PDF
        </>
      )}
    </button>
  );
}

// ─── Main ReportViewer ─────────────────────────────────────────────────────────

export function ReportViewer({ report, reportId, token }: ReportViewerProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const primaryColor = report.branding.primaryColor || '#0D9488';

  // Back to top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Active section tracking via IntersectionObserver
  useEffect(() => {
    const sectionIds = report.sections.map(s => s.sectionId);
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach(id => {
      const el = document.getElementById(`section-${id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: '-20% 0px -60% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [report.sections]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const publishedDate = new Date(report.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const propertyAddress = `${report.property.address}, ${report.property.city}, ${report.property.state} ${report.property.zip}`;
  const totalFindings = report.findingCounts.critical + report.findingCounts.major +
    report.findingCounts.minor + report.findingCounts.informational;

  return (
    <div className="min-h-screen bg-slate-50" ref={mainRef}>
      {/* ── Sticky Top Bar ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: logo / firm name */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
            {report.branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={report.branding.logoUrl}
                alt={report.firmName || 'Inspector'}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900 text-sm truncate max-w-[140px]">
                  {report.firmName || 'Inspectly'}
                </span>
              </div>
            )}
          </div>

          {/* Center: address */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-sm min-w-0">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{propertyAddress}</span>
          </div>

          {/* Right: TOC toggle (mobile) + PDF button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Mobile TOC toggle */}
            <button
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              onClick={() => setTocOpen(o => !o)}
              aria-label="Toggle table of contents"
            >
              <Menu className="w-5 h-5" />
            </button>
            <PdfDownloadButton reportId={reportId} token={token} />
          </div>
        </div>
      </header>

      {/* ── Mobile TOC Drawer ──────────────────────────────────────────── */}
      {tocOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setTocOpen(false)} />
          <div className="relative ml-auto w-72 bg-white h-full overflow-y-auto shadow-xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-slate-900">Table of Contents</h2>
              <button onClick={() => setTocOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <TableOfContents
              sections={report.sections}
              primaryColor={primaryColor}
              activeSection={activeSection}
            />
          </div>
        </div>
      )}

      {/* ── Page Body ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar TOC — desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-xl border border-slate-200 p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
              <TableOfContents
                sections={report.sections}
                primaryColor={primaryColor}
                activeSection={activeSection}
              />
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 space-y-8">
            {/* ── Cover Card ──────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Color banner */}
              <div className="h-2" style={{ backgroundColor: primaryColor }} />
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1">
                      Inspection Report
                    </h1>
                    <p className="text-slate-500 text-sm">Report v{report.version}</p>
                  </div>
                  <div
                    className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {report.property.propertyType}
                  </div>
                </div>

                {/* Property details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Property</p>
                        <p className="text-slate-900 font-medium">{report.property.address}</p>
                        <p className="text-slate-600 text-sm">
                          {report.property.city}, {report.property.state} {report.property.zip}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Inspection Date</p>
                        <p className="text-slate-900 font-medium">{publishedDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Inspector</p>
                        <p className="text-slate-900 font-medium">{report.inspectorName}</p>
                        {report.inspectorLicense && (
                          <p className="text-slate-500 text-sm">License #{report.inspectorLicense}</p>
                        )}
                        {report.firmName && (
                          <p className="text-slate-600 text-sm">{report.firmName}</p>
                        )}
                      </div>
                    </div>
                    {(report.property.yearBuilt || report.property.squareFootage) && (
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Property Details</p>
                          {report.property.yearBuilt && (
                            <p className="text-slate-600 text-sm">Built {report.property.yearBuilt}</p>
                          )}
                          {report.property.squareFootage && (
                            <p className="text-slate-600 text-sm">
                              {report.property.squareFootage.toLocaleString()} sq ft
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats pills */}
                <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
                  <div className="bg-slate-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
                    <p className="text-2xl font-bold text-slate-900">{totalFindings}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Total Findings</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
                    <p className="text-2xl font-bold text-slate-900">{report.sections.length}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Sections</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
                    <p className="text-2xl font-bold text-slate-900">{report.totalPhotos}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Photos</p>
                  </div>
                  {report.findingCounts.critical > 0 && (
                    <div className="bg-red-50 rounded-lg px-4 py-2 text-center min-w-[80px]">
                      <p className="text-2xl font-bold text-red-600">{report.findingCounts.critical}</p>
                      <p className="text-xs text-red-500 mt-0.5">Critical</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Executive Summary ────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span
                  className="w-1 h-6 rounded-full block"
                  style={{ backgroundColor: '#0D9488' }}
                />
                Executive Summary
              </h2>
              <div
                className="border-l-4 pl-5 py-1"
                style={{ borderColor: primaryColor }}
              >
                <p className="text-slate-700 leading-relaxed text-sm sm:text-base whitespace-pre-line">
                  {report.executiveSummary}
                </p>
              </div>
            </div>

            {/* ── Severity Overview ────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-5">Findings Overview</h2>
              <SeverityBarChart counts={report.findingCounts} />
            </div>

            {/* ── Inspection Summary Table ─────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-5">Inspection Summary</h2>
              <p className="text-sm text-slate-500 mb-4">Click a row to jump to that section.</p>
              <SummaryTable sections={report.sections} />
            </div>

            {/* ── Report Sections ──────────────────────────────────────── */}
            <div className="space-y-6">
              {report.sections.map(section => (
                <SectionBlock
                  key={section.sectionId}
                  section={section}
                  primaryColor={primaryColor}
                  onPhotoClick={(photos, index) => setLightbox({ photos, index })}
                />
              ))}
            </div>

            {/* ── Footer ──────────────────────────────────────────────── */}
            <footer className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div
                className="h-1 rounded-full mb-6"
                style={{ backgroundColor: primaryColor }}
              />
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  {report.firmName && (
                    <p className="font-bold text-slate-900 mb-2">{report.firmName}</p>
                  )}
                  <div className="space-y-1 text-sm text-slate-600">
                    {report.branding.companyPhone && (
                      <p>{report.branding.companyPhone}</p>
                    )}
                    {report.branding.companyEmail && (
                      <p>
                        <a
                          href={`mailto:${report.branding.companyEmail}`}
                          className="hover:underline"
                          style={{ color: primaryColor }}
                        >
                          {report.branding.companyEmail}
                        </a>
                      </p>
                    )}
                    {report.branding.companyWebsite && (
                      <p>
                        <a
                          href={report.branding.companyWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                          style={{ color: primaryColor }}
                        >
                          {report.branding.companyWebsite}
                        </a>
                      </p>
                    )}
                  </div>
                </div>
                {report.branding.reportFooterText && (
                  <div className="sm:max-w-sm text-xs text-slate-400 leading-relaxed">
                    {report.branding.reportFooterText}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-6 text-center">
                Report generated {publishedDate} &bull; Inspectly
              </p>
            </footer>
          </main>
        </div>
      </div>

      {/* ── Back to Top Button ──────────────────────────────────────────── */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-30 w-12 h-12 rounded-full bg-slate-900 text-white shadow-lg hover:bg-slate-700 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          aria-label="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      {/* ── Lightbox ────────────────────────────────────────────────────── */}
      {lightbox && (
        <Lightbox state={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
