'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CivicReport, ReportStatus, Urgency, Category } from '@/lib/types';
import { SAMPLE_REPORTS } from '@/lib/sampleReports';

// ─── Helpers ────────────────────────────────────────────────────────────────

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
  } catch { /* quota full — ignore */ }
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
  new: '🔵 New',
  acknowledged: '🟡 Acknowledged',
  in_progress: '🟢 In Progress',
  resolved: '✅ Resolved',
};

const URGENCY_LABELS: Record<Urgency, string> = {
  low: '● Low',
  medium: '● Medium',
  high: '● High',
  critical: '🔴 Critical',
};

function urgencyOrder(u: Urgency) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[u] ?? 99;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ value, label, icon, color }: {
  value: number; label: string; icon: string; color: string;
}) {
  return (
    <div className="stat-card fade-in">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <span className={`badge badge-urgency-${urgency}`}>{URGENCY_LABELS[urgency]}</span>;
}

function StatusBadge({ status }: { status: ReportStatus }) {
  return <span className={`badge badge-status-${status}`}>{STATUS_LABELS[status]}</span>;
}

function CategoryTag({ category }: { category: Category }) {
  return <span className="tag">{CATEGORY_LABELS[category]}</span>;
}

// ─── Submission Form ─────────────────────────────────────────────────────────

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
    'There is a deep pothole on Victoria Road near the petrol station. It\'s about 40 cm deep and cars have been swerving to avoid it for over a week. Someone could get into an accident.',
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
    } catch (err) {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
              Submit Civic Report
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Describe the issue — Gemini AI will analyse and classify it automatically.
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 18, padding: '6px 10px' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="description">Issue Description *</label>
            <textarea
              id="description"
              className="textarea"
              placeholder="Describe the civic issue in as much detail as possible — what, where, how severe, how long it has been going on..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ minHeight: 140 }}
              required
              disabled={loading}
            />
            <span className="form-hint">{description.length} characters</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="location">Location (optional)</label>
            <input
              id="location"
              type="text"
              className="input"
              placeholder="e.g. Corner of Main St & Oak Ave, near the park"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
            <span className="form-hint">AI will also try to extract location from your description.</span>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
            <button
              type="button"
              className="btn btn-amber btn-sm"
              onClick={loadSample}
              disabled={loading}
              title="Load a sample report to test immediately"
            >
              ⚡ Sample Report
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
                  <div className="spinner" style={{ width: 16, height: 16 }} />
                  Analysing with Gemini…
                </>
              ) : (
                '🚀 Submit & Analyse'
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
      <div className="modal-content" style={{ maxWidth: 700 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {report.isDemo && <span className="badge badge-demo">📌 Demo Data</span>}
              {report.isUnanalysed && <span className="badge" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>⚡ Unanalysed</span>}
              {report.analysis && <CategoryTag category={report.analysis.category} />}
              {report.analysis && <UrgencyBadge urgency={report.analysis.urgency} />}
              <StatusBadge status={report.status} />
            </div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>
              {report.analysis?.title ?? 'Unanalysed Report'}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              ID: {report.id} · Submitted {formatDate(report.createdAt)}
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 18, padding: '6px 10px', flexShrink: 0 }}>✕</button>
        </div>

        <div className="divider" />

        {/* Analysis error */}
        {report.analysisError && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            <span>⚠️</span>
            <span><strong>AI Analysis Failed:</strong> {report.analysisError}</span>
          </div>
        )}

        {/* Analysis */}
        {report.analysis && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 24 }}>
            <div>
              <div className="section-heading">AI Summary</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{report.analysis.summary}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: 16 }}>
                <div className="section-heading">Suggested Department</div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>{report.analysis.suggestedDepartment}</p>
              </div>
              <div className="card" style={{ padding: 16 }}>
                <div className="section-heading">Extracted Location</div>
                <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {report.analysis.extractedLocation ?? report.location ?? '—'}
                </p>
              </div>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div className="section-heading">Recommended Action</div>
              <p style={{ fontSize: 14, color: 'var(--teal-300)', fontWeight: 500, lineHeight: 1.6 }}>{report.analysis.recommendedAction}</p>
            </div>

            {report.analysis.keyEvidence.length > 0 && (
              <div>
                <div className="section-heading">Key Evidence</div>
                <ul className="evidence-list">
                  {report.analysis.keyEvidence.map((e, i) => (
                    <li key={i} className="evidence-item">
                      <span className="evidence-dot" />
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Raw description */}
        <div style={{ marginBottom: 24 }}>
          <div className="section-heading">Original Report</div>
          <div className="card" style={{ padding: 16, background: 'var(--bg-elevated)' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic' }}>
              "{report.rawDescription}"
            </p>
            {report.location && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>📍 {report.location}</p>
            )}
          </div>
        </div>

        {/* Duplicate suggestions */}
        {duplicates.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="alert alert-warning">
              <span>🔁</span>
              <div>
                <strong>Possible Duplicates Detected</strong>
                <ul style={{ marginTop: 6, paddingLeft: 16, fontSize: 13 }}>
                  {duplicates.map((d) => (
                    <li key={d.id} style={{ marginTop: 4 }}>
                      {d.analysis?.title ?? d.rawDescription.slice(0, 60) + '…'}{' '}
                      <span style={{ color: 'var(--text-muted)' }}>({d.id.slice(0, 8)})</span>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>
                  These are suggestions only — the report has been saved and can be investigated separately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Status update */}
        <div className="divider" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Update Status:</span>
          {(['new', 'acknowledged', 'in_progress', 'resolved'] as ReportStatus[]).map((s) => (
            <button
              key={s}
              id={`status-btn-${s}`}
              className={`btn btn-sm ${report.status === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { onStatusChange(report.id, s); onClose(); }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Report Card ─────────────────────────────────────────────────────────────

function ReportCard({ report, onClick }: { report: CivicReport; onClick: () => void }) {
  const urgencyBorder: Record<Urgency, string> = {
    low: '2px solid rgba(34,197,94,0.3)',
    medium: '2px solid rgba(251,191,36,0.3)',
    high: '2px solid rgba(249,115,22,0.4)',
    critical: '2px solid rgba(239,68,68,0.5)',
  };

  return (
    <div
      className="card card-interactive fade-in"
      onClick={onClick}
      id={`report-card-${report.id}`}
      style={{
        borderLeft: report.analysis ? urgencyBorder[report.analysis.urgency] : '2px solid var(--border)',
        paddingLeft: 20,
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {report.isDemo && <span className="badge badge-demo" style={{ fontSize: '9px' }}>DEMO</span>}
          {report.analysis && <CategoryTag category={report.analysis.category} />}
          {report.analysis && <UrgencyBadge urgency={report.analysis.urgency} />}
          {report.isUnanalysed && (
            <span className="badge" style={{ background: 'rgba(148,163,184,0.1)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 9 }}>UNANALYSED</span>
          )}
        </div>
        <StatusBadge status={report.status} />
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 6 }}>
        {report.analysis?.title ?? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending AI analysis…</span>}
      </h3>

      {/* Summary */}
      {report.analysis?.summary && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {report.analysis.summary}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>
          {report.analysis?.extractedLocation ?? report.location
            ? `📍 ${report.analysis?.extractedLocation ?? report.location}`
            : '📍 No location'}
        </span>
        <span>{formatDate(report.createdAt)}</span>
      </div>

      {report.duplicateSuggestions.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--amber-400)' }}>
          🔁 {report.duplicateSuggestions.length} possible duplicate{report.duplicateSuggestions.length > 1 ? 's' : ''} detected
        </div>
      )}
    </div>
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
      prev.map((r) => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r)
    );
    showToast(`Status updated to "${STATUS_LABELS[status].replace(/^[^\s]*\s/, '')}"`);
  }, [showToast]);

  // Stats
  const stats = useMemo(() => ({
    total: reports.length,
    unresolved: reports.filter((r) => r.status !== 'resolved').length,
    highPriority: reports.filter((r) => r.analysis?.urgency === 'high' || r.analysis?.urgency === 'critical').length,
    resolved: reports.filter((r) => r.status === 'resolved').length,
  }), [reports]);

  // Filtered & sorted
  const filteredReports = useMemo(() => {
    let filtered = reports.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || (
        r.rawDescription.toLowerCase().includes(q) ||
        r.analysis?.title?.toLowerCase().includes(q) ||
        r.analysis?.summary?.toLowerCase().includes(q) ||
        r.analysis?.extractedLocation?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q)
      );
      const matchesCategory = !filterCategory || r.analysis?.category === filterCategory;
      const matchesUrgency = !filterUrgency || r.analysis?.urgency === filterUrgency;
      const matchesStatus = !filterStatus || r.status === filterStatus;
      return matchesSearch && matchesCategory && matchesUrgency && matchesStatus;
    });

    // Sort: critical first, then by date
    filtered.sort((a, b) => {
      const ua = a.analysis ? urgencyOrder(a.analysis.urgency) : 5;
      const ub = b.analysis ? urgencyOrder(b.analysis.urgency) : 5;
      if (ua !== ub) return ua - ub;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [reports, searchQuery, filterCategory, filterUrgency, filterStatus]);

  const hasActiveFilters = searchQuery || filterCategory || filterUrgency || filterStatus;

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--teal-500), var(--navy-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              boxShadow: '0 4px 14px rgba(20,184,166,0.35)',
            }}>🏙️</div>
            <div>
              <h1 className="font-display text-gradient" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1 }}>
                CivicLens AI
              </h1>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Civic Operations Dashboard</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="load-sample-header-btn"
              className="btn btn-amber btn-sm"
              onClick={() => {
                const sampleExists = reports.some((r) => r.isDemo);
                if (!sampleExists) {
                  setReports((prev) => [...SAMPLE_REPORTS, ...prev.filter((r) => !r.isDemo)]);
                  showToast('📌 Sample demo data loaded!');
                } else {
                  showToast('ℹ️ Sample data already loaded.');
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

      <main className="container" style={{ padding: '32px 24px', maxWidth: 1280 }}>

        {/* Hero */}
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <h2 className="font-display" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, marginBottom: 10 }}>
            <span className="text-gradient">AI-Powered</span> Civic Intelligence
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 560, margin: '0 auto' }}>
            Submit community issue reports in plain language. Gemini AI instantly classifies, prioritises, and routes each report to the right department.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 36 }}>
          <StatCard value={stats.total}       label="Total Reports"    icon="📋" color="var(--teal-400)" />
          <StatCard value={stats.unresolved}  label="Unresolved"       icon="🔄" color="var(--amber-400)" />
          <StatCard value={stats.highPriority} label="High Priority"   icon="🔴" color="#f87171" />
          <StatCard value={stats.resolved}    label="Resolved"         icon="✅" color="#4ade80" />
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr repeat(3, auto)', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrapper">
              <span className="search-icon">🔍</span>
              <input
                id="search-input"
                type="search"
                className="search-input"
                placeholder="Search reports by title, description, location…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select id="filter-category" className="select" style={{ width: 160 }} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as Category | '')}>
              <option value="">All Categories</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>

            <select id="filter-urgency" className="select" style={{ width: 150 }} value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value as Urgency | '')}>
              <option value="">All Urgencies</option>
              {(['critical', 'high', 'medium', 'low'] as Urgency[]).map((u) => (
                <option key={u} value={u}>{URGENCY_LABELS[u]}</option>
              ))}
            </select>

            <select id="filter-status" className="select" style={{ width: 170 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as ReportStatus | '')}>
              <option value="">All Statuses</option>
              {(['new', 'acknowledged', 'in_progress', 'resolved'] as ReportStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {filteredReports.length} of {reports.length} reports
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => { setSearchQuery(''); setFilterCategory(''); setFilterUrgency(''); setFilterStatus(''); }}>
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Report Grid */}
        {!hydrated ? (
          <div className="empty-state">
            <div className="spinner spinner-lg" style={{ margin: '0 auto 16px' }} />
            <p>Loading reports…</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>{hasActiveFilters ? 'No reports match your filters' : 'No reports yet'}</h3>
            <p style={{ marginBottom: 20 }}>
              {hasActiveFilters ? 'Try adjusting your search or filters.' : 'Submit your first civic report or load sample data to get started.'}
            </p>
            {!hasActiveFilters && (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setShowSubmit(true)}>+ Submit Report</button>
                <button className="btn btn-amber" onClick={() => { setReports([...SAMPLE_REPORTS]); showToast('📌 Sample data loaded!'); }}>⚡ Load Sample Data</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => setSelectedReport(report)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Submit modal */}
      {showSubmit && (
        <SubmitForm
          onSubmit={handleSubmit}
          onClose={() => setShowSubmit(false)}
          existingReports={reports}
        />
      )}

      {/* Detail modal */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          allReports={reports}
          onClose={() => setSelectedReport(null)}
          onStatusChange={handleStatusChange}
        />
      )}

      {/* Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)', padding: '12px 20px',
          fontSize: 14, fontWeight: 500, color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-card)', animation: 'fadeIn 0.25s ease',
          maxWidth: 420,
        }}>
          {toastMessage}
        </div>
      )}
    </>
  );
}
