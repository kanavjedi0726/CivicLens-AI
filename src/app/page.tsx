'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CivicReport, ReportStatus, Urgency, Category } from '@/lib/types';
import { SAMPLE_REPORTS } from '@/lib/sampleReports';

// ─── Constants & Helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'civicLens_reports_v2';

function loadReports(): CivicReport[] {
  if (typeof window === 'undefined') return SAMPLE_REPORTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_REPORTS;
    return JSON.parse(raw) as CivicReport[];
  } catch {
    return SAMPLE_REPORTS;
  }
}

function saveReports(reports: CivicReport[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch {
    /* ignore storage quota limits */
  }
}

const CATEGORY_LABELS: Record<Category, string> = {
  pothole: '🕳️ Pothole',
  garbage: '🗑️ Garbage',
  water_leak: '💧 Water Leak',
  streetlight: '💡 Streetlight',
  road_safety: '⚠️ Road Safety',
  vandalism: '🚧 Vandalism',
  flooding: '🌊 Flooding',
  noise: '🔊 Noise',
  other: '📋 Other',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  new: '● New',
  acknowledged: '● Acknowledged',
  in_progress: '● In Progress',
  resolved: '✓ Resolved',
};

const URGENCY_LABELS: Record<Urgency, string> = {
  low: '● Low',
  medium: '● Medium',
  high: '● High',
  critical: '● Critical',
};

function urgencyOrder(u: Urgency) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[u] ?? 99;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ─── Micro UI Components ─────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  sublabel,
  icon,
  accentColor,
}: {
  value: number;
  label: string;
  sublabel: string;
  icon: string;
  accentColor: string;
}) {
  return (
    <div className="stat-card fade-in">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        <span className="stat-icon-wrap" aria-hidden="true">{icon}</span>
      </div>
      <div className="stat-value" style={{ color: accentColor }}>
        {value}
      </div>
      <div className="stat-desc">{sublabel}</div>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return (
    <span className={`badge badge-urgency-${urgency}`}>
      {URGENCY_LABELS[urgency]}
    </span>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge badge-status-${status}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function CategoryTag({ category }: { category: Category }) {
  return <span className="tag">{CATEGORY_LABELS[category]}</span>;
}

// ─── Submission Form Modal ───────────────────────────────────────────────────

function SubmitForm({
  onSubmit,
  onClose,
  existingReports,
}: {
  onSubmit: (report: CivicReport) => void;
  onClose: () => void;
  existingReports: CivicReport[];
}) {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SAMPLE_DESCRIPTIONS = [
    'There is a deep pothole on Victoria Road near the petrol station. It is about 40 cm deep and cars have been swerving to avoid it for over a week. Someone could get into an accident.',
    'Garbage has not been collected on Maple Avenue for 12 days. Bags are piling up outside multiple houses, attracting rats and flies. The smell is terrible.',
    'The traffic light at the corner of High Street and Park Lane is stuck on red in one direction. Traffic is building up during rush hours.',
    'There is a significant water leak under the road on Church Street. Water is pooling and the tarmac is starting to crack. Looks like a burst pipe underground.',
  ];

  const loadSample = () => {
    const s = SAMPLE_DESCRIPTIONS[Math.floor(Math.random() * SAMPLE_DESCRIPTIONS.length)];
    setDescription(s);
    setLocation('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          location: location.trim() || undefined,
          existingReports,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'An unexpected error occurred.');
        return;
      }
      onSubmit(data.report as CivicReport);
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 className="modal-title font-display">
              Submit Civic Incident
            </h2>
            <p className="modal-subtitle">
              Describe the community issue in plain words — Gemini AI will analyse, prioritize, and route it.
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close modal"
            style={{ fontSize: 16, padding: '4px 8px' }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Issue Description *
            </label>
            <textarea
              id="description"
              className="textarea"
              placeholder="Describe what happened, the severity, exact location landmarks, and potential public risks..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: 130 }}
              required
              disabled={loading}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="form-hint">{description.length} characters</span>
              {description.length > 0 && description.length < 10 && (
                <span className="form-hint" style={{ color: 'var(--amber-400)' }}>At least 10 characters required</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">
              Location Landmark (Optional)
            </label>
            <input
              id="location"
              type="text"
              className="input"
              placeholder="e.g. Corner of Main St & Oak Ave, outside the library"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
            <span className="form-hint">Gemini will also extract street addresses directly from the description text.</span>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 6, alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-amber btn-sm"
              onClick={loadSample}
              disabled={loading}
              title="Load sample citizen description to test quickly"
            >
              ⚡ Insert Example
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="submit-report-btn"
              className="btn btn-primary"
              disabled={loading}
              style={{ marginLeft: 'auto' }}
            >
              {loading ? (
                <>
                  <div className="spinner" />
                  <span>Analysing with Gemini…</span>
                </>
              ) : (
                'Submit & Triage Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Report Detail Modal ─────────────────────────────────────────────────────

function ReportDetail({
  report,
  allReports,
  onClose,
  onStatusChange,
}: {
  report: CivicReport;
  allReports: CivicReport[];
  onClose: () => void;
  onStatusChange: (id: string, status: ReportStatus) => void;
}) {
  const duplicates = report.duplicateSuggestions
    .map((id) => allReports.find((r) => r.id === id))
    .filter(Boolean) as CivicReport[];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              {report.isDemo && <span className="badge badge-demo">DEMO</span>}
              {report.isUnanalysed && <span className="badge badge-unanalysed">UNANALYSED</span>}
              {report.analysis && <CategoryTag category={report.analysis.category} />}
              {report.analysis && <UrgencyBadge urgency={report.analysis.urgency} />}
              <StatusBadge status={report.status} />
            </div>
            <h2 className="modal-title font-display">
              {report.analysis?.title ?? 'Unanalysed Incident Report'}
            </h2>
            <p className="modal-subtitle">
              Reference: <code style={{ color: 'var(--teal-300)', fontFamily: 'monospace' }}>{report.id}</code> · Logged {formatDate(report.createdAt)}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close modal"
            style={{ fontSize: 16, padding: '4px 8px', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Analysis failure alert if applicable */}
        {report.analysisError && (
          <div className="alert alert-warning">
            <span>⚠️</span>
            <div>
              <strong>Gemini Analysis Notice:</strong> {report.analysisError}
            </div>
          </div>
        )}

        {/* AI Intelligence Panel */}
        {report.analysis && (
          <div className="ai-intelligence-panel">
            <div className="modal-section-title" style={{ color: 'var(--teal-400)' }}>
              <span>✦</span>
              <span>Gemini AI Incident Assessment</span>
            </div>

            {/* AI Summary */}
            <div>
              <div className="ai-meta-label">Incident Summary</div>
              <p className="ai-summary-text">{report.analysis.summary}</p>
            </div>

            {/* Department & Location metadata */}
            <div className="ai-meta-grid">
              <div className="ai-meta-item">
                <div className="ai-meta-label">Assigned Department</div>
                <div className="ai-meta-val">
                  🏛️ {report.analysis.suggestedDepartment}
                </div>
              </div>
              <div className="ai-meta-item">
                <div className="ai-meta-label">Extracted Location</div>
                <div className="ai-meta-val">
                  📍 {report.analysis.extractedLocation ?? report.location ?? 'None specified'}
                </div>
              </div>
            </div>

            {/* Highlighted Recommended Action */}
            <div className="recommended-action-box">
              <div className="recommended-action-header">
                <span>⚡</span>
                <span>Recommended Municipal Action</span>
              </div>
              <p className="recommended-action-body">
                {report.analysis.recommendedAction}
              </p>
            </div>

            {/* Key Evidence */}
            {report.analysis.keyEvidence.length > 0 && (
              <div>
                <div className="ai-meta-label" style={{ marginBottom: 6 }}>Key Supporting Evidence</div>
                <ul className="evidence-list">
                  {report.analysis.keyEvidence.map((e, i) => (
                    <li key={i} className="evidence-item">
                      <span className="evidence-dot" />
                      <span>{e}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Original Citizen Submission */}
        <div className="modal-section">
          <div className="modal-section-title">Citizen Submission</div>
          <div className="original-report-box">
            <p className="original-report-text">
              &ldquo;{report.rawDescription}&rdquo;
            </p>
            {report.location && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span>📍 Citizen noted location:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{report.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Duplicate suggestions */}
        {duplicates.length > 0 && (
          <div className="alert alert-warning">
            <span>🔁</span>
            <div style={{ flex: 1 }}>
              <strong>Potential Duplicate Incidents ({duplicates.length})</strong>
              <ul style={{ marginTop: 6, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
                {duplicates.map((d) => (
                  <li key={d.id} style={{ marginTop: 3 }}>
                    <span style={{ fontWeight: 600 }}>{d.analysis?.title ?? d.rawDescription.slice(0, 50) + '…'}</span>{' '}
                    <span style={{ color: 'var(--text-muted)' }}>({d.id})</span>
                  </li>
                ))}
              </ul>
              <p style={{ fontSize: 11.5, marginTop: 6, color: 'var(--amber-300)', opacity: 0.9 }}>
                Duplicate flagging is advisory to assist dispatchers in cross-referencing related tickets.
              </p>
            </div>
          </div>
        )}

        {/* Status controls */}
        <div className="status-controls-bar">
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginRight: 4 }}>
            Update Status:
          </span>
          {(['new', 'acknowledged', 'in_progress', 'resolved'] as ReportStatus[]).map((s) => (
            <button
              key={s}
              id={`status-btn-${s}`}
              className={`status-control-btn ${report.status === s ? 'active' : ''}`}
              onClick={() => {
                onStatusChange(report.id, s);
                onClose();
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Report Card Component ───────────────────────────────────────────────────

function ReportCard({ report, onClick }: { report: CivicReport; onClick: () => void }) {
  const urgencyClass = report.analysis ? `urgency-${report.analysis.urgency}` : '';

  return (
    <article
      className="report-card fade-in"
      onClick={onClick}
      id={`report-card-${report.id}`}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View report ${report.id}`}
    >
      {/* Urgency indicator strip */}
      {report.analysis && (
        <div className={`report-card-urgency-indicator ${urgencyClass}`} />
      )}

      {/* Badges header */}
      <div className="report-card-header">
        <div className="report-card-badges">
          {report.isDemo && <span className="badge badge-demo">DEMO</span>}
          {report.isUnanalysed && <span className="badge badge-unanalysed">UNANALYSED</span>}
          {report.analysis && <CategoryTag category={report.analysis.category} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {report.analysis && <UrgencyBadge urgency={report.analysis.urgency} />}
          <StatusBadge status={report.status} />
        </div>
      </div>

      {/* Title */}
      <h3 className="report-card-title">
        {report.analysis?.title ?? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending AI analysis…</span>
        )}
      </h3>

      {/* Summary */}
      {report.analysis?.summary && (
        <p className="report-card-summary">
          {report.analysis.summary}
        </p>
      )}

      {/* Suggested department micro-tag */}
      {report.analysis?.suggestedDepartment && (
        <div style={{ marginBottom: 10 }}>
          <span style={{
            fontSize: 11,
            color: 'var(--teal-300)',
            background: 'rgba(20, 184, 166, 0.08)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            fontWeight: 500,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            🏛️ {report.analysis.suggestedDepartment}
          </span>
        </div>
      )}

      {/* Footer metadata */}
      <div className="report-card-meta">
        <span
          className="report-meta-location"
          title={report.analysis?.extractedLocation ?? report.location ?? 'No location specified'}
        >
          📍 {report.analysis?.extractedLocation ?? report.location ?? 'Location not specified'}
        </span>
        <span className="report-meta-date">{formatDate(report.createdAt)}</span>
      </div>

      {/* Duplicate warning tag */}
      {report.duplicateSuggestions.length > 0 && (
        <div className="duplicate-flag">
          <span>🔁</span>
          <span>{report.duplicateSuggestions.length} potential duplicate{report.duplicateSuggestions.length > 1 ? 's' : ''} detected</span>
        </div>
      )}
    </article>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const [reports, setReports] = useState<CivicReport[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [showSubmit, setShowSubmit] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CivicReport | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<Category | ''>('');
  const [filterUrgency, setFilterUrgency] = useState<Urgency | ''>('');
  const [filterStatus, setFilterStatus] = useState<ReportStatus | ''>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    setReports(loadReports());
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (hydrated) saveReports(reports);
  }, [reports, hydrated]);

  // Toast helper
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleSubmit = useCallback((report: CivicReport) => {
    setReports((prev) => [report, ...prev]);
    setShowSubmit(false);
    showToast(
      report.analysisError
        ? '⚠️ Report saved (AI analysis failed — see details)'
        : '✅ Report submitted and analysed successfully!'
    );
    setSelectedReport(report);
  }, [showToast]);

  const handleStatusChange = useCallback((id: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r))
    );
    const labelClean = STATUS_LABELS[status].replace(/^[^\s]*\s/, '');
    showToast(`Status updated to "${labelClean}"`);
  }, [showToast]);

  // Summary stats
  const stats = useMemo(() => ({
    total: reports.length,
    unresolved: reports.filter((r) => r.status !== 'resolved').length,
    highPriority: reports.filter((r) => r.analysis?.urgency === 'high' || r.analysis?.urgency === 'critical').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }), [reports]);

  // Filtered & sorted reports
  const filteredReports = useMemo(() => {
    const filtered = reports.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || (
        r.rawDescription.toLowerCase().includes(q) ||
        r.analysis?.title?.toLowerCase().includes(q) ||
        r.analysis?.summary?.toLowerCase().includes(q) ||
        r.analysis?.suggestedDepartment?.toLowerCase().includes(q) ||
        r.analysis?.extractedLocation?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q)
      );
      const matchesCategory = !filterCategory || r.analysis?.category === filterCategory;
      const matchesUrgency = !filterUrgency || r.analysis?.urgency === filterUrgency;
      const matchesStatus = !filterStatus || r.status === filterStatus;
      return matchesSearch && matchesCategory && matchesUrgency && matchesStatus;
    });

    // Sort: critical first, then newest
    filtered.sort((a, b) => {
      const ua = a.analysis ? urgencyOrder(a.analysis.urgency) : 5;
      const ub = b.analysis ? urgencyOrder(b.analysis.urgency) : 5;
      if (ua !== ub) return ua - ub;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [reports, searchQuery, filterCategory, filterUrgency, filterStatus]);

  const hasActiveFilters = Boolean(searchQuery || filterCategory || filterUrgency || filterStatus);

  return (
    <>
      {/* Compact Civic Header */}
      <header className="header">
        <div className="container header-inner">
          <div className="brand-wrapper">
            <div className="brand-logo" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <path d="M11 8v6M8 11h6" />
              </svg>
            </div>
            <div>
              <div className="brand-title">
                <span>CivicLens</span>
                <span className="brand-tag">AI</span>
              </div>
              <div className="brand-sub">Municipal Incident Triage & Operations</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              id="load-sample-header-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const sampleExists = reports.some((r) => r.isDemo);
                if (!sampleExists) {
                  setReports((prev) => [...SAMPLE_REPORTS, ...prev.filter((r) => !r.isDemo)]);
                  showToast('📌 Demonstration dataset loaded!');
                } else {
                  showToast('ℹ️ Sample data is already loaded.');
                }
              }}
            >
              ⚡ Load Samples
            </button>
            <button
              id="new-report-btn"
              className="btn btn-primary"
              onClick={() => setShowSubmit(true)}
            >
              + New Report
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="container" style={{ paddingBottom: 48, flex: 1 }}>

        {/* Reduced, purposeful operational header strip */}
        <section className="operational-strip" aria-label="Incident Triage Overview">
          <div className="operational-info">
            <h1 className="font-display">Incident Dispatch & Operational Intelligence</h1>
            <p>Real-time citizen reporting intake, automated Gemini classification, and municipal routing.</p>
          </div>
          <div className="live-pill">
            <span className="live-indicator" />
            <span>Triage Live</span>
            <span style={{ color: 'var(--border-default)' }}>|</span>
            <span style={{ color: 'var(--text-secondary)' }}>{stats.unresolved} Pending Action</span>
          </div>
        </section>

        {/* Summary Metrics */}
        <section className="stats-grid" aria-label="Incident Summary Metrics">
          <StatCard
            value={stats.total}
            label="Total Incidents"
            sublabel="All logged civic records"
            icon="📋"
            accentColor="#38bdf8"
          />
          <StatCard
            value={stats.unresolved}
            label="Needs Action"
            sublabel="Awaiting resolution"
            icon="⏳"
            accentColor="#fbbf24"
          />
          <StatCard
            value={stats.highPriority}
            label="High / Critical"
            sublabel="Immediate triage queue"
            icon="⚠️"
            accentColor="#f87171"
          />
          <StatCard
            value={stats.resolved}
            label="Resolved"
            sublabel="Completed interventions"
            icon="✅"
            accentColor="#34d399"
          />
        </section>

        {/* Filter and Search Panel */}
        <section className="filter-panel" aria-label="Incident Filters">
          <div className="filter-grid">
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                id="search-input"
                type="search"
                className="search-input"
                placeholder="Search reports by title, description, location, or department…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="select-wrapper">
              <select
                id="filter-category"
                className="select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value as Category | '')}
              >
                <option value="">All Categories</option>
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
              <span className="select-chevron">▼</span>
            </div>

            <div className="select-wrapper">
              <select
                id="filter-urgency"
                className="select"
                value={filterUrgency}
                onChange={(e) => setFilterUrgency(e.target.value as Urgency | '')}
              >
                <option value="">All Urgencies</option>
                {(['critical', 'high', 'medium', 'low'] as Urgency[]).map((u) => (
                  <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
                ))}
              </select>
              <span className="select-chevron">▼</span>
            </div>

            <div className="select-wrapper">
              <select
                id="filter-status"
                className="select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ReportStatus | '')}
              >
                <option value="">All Statuses</option>
                {(['new', 'acknowledged', 'in_progress', 'resolved'] as ReportStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <span className="select-chevron">▼</span>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="filter-active-bar">
              <div className="filter-pills-list">
                <span>Showing <strong>{filteredReports.length}</strong> of {reports.length} reports</span>
                {searchQuery && (
                  <span className="filter-active-pill">
                    Query: &ldquo;{searchQuery}&rdquo;
                  </span>
                )}
                {filterCategory && (
                  <span className="filter-active-pill">
                    {CATEGORY_LABELS[filterCategory]}
                  </span>
                )}
                {filterUrgency && (
                  <span className="filter-active-pill">
                    {URGENCY_LABELS[filterUrgency]}
                  </span>
                )}
                {filterStatus && (
                  <span className="filter-active-pill">
                    {STATUS_LABELS[filterStatus]}
                  </span>
                )}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterCategory('');
                  setFilterUrgency('');
                  setFilterStatus('');
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Reports Grid / Empty State */}
        <section aria-label="Incident Reports Feed">
          {!hydrated ? (
            <div className="empty-state">
              <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
              <p>Loading incident repository…</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>{hasActiveFilters ? 'No reports match your filters' : 'No reports yet'}</h3>
              <p style={{ marginBottom: 20 }}>
                {hasActiveFilters
                  ? 'Try adjusting your search query or reset the active filter options.'
                  : 'Submit your first civic incident report or load sample data to test AI triage.'}
              </p>
              {!hasActiveFilters && (
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => setShowSubmit(true)}>
                    + Submit Report
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setReports([...SAMPLE_REPORTS]);
                      showToast('📌 Sample data loaded!');
                    }}
                  >
                    ⚡ Load Sample Data
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => setSelectedReport(report)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Submission Form Modal */}
      {showSubmit && (
        <SubmitForm
          onSubmit={handleSubmit}
          onClose={() => setShowSubmit(false)}
          existingReports={reports}
        />
      )}

      {/* Detail Modal */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          allReports={reports}
          onClose={() => setSelectedReport(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Status Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 200,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-accent)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-modal)',
            animation: 'fadeIn 0.2s ease',
            maxWidth: 420,
          }}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
