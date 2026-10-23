'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CivicReport, ReportStatus, Urgency, Category } from '@/lib/types';
import { SAMPLE_REPORTS } from '@/lib/sampleReports';
import { urgencyOrder } from '@/lib/triage';

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
  pothole: '🕳️ Potholes',
  garbage: '🗑️ Garbage',
  water_leak: '💧 Water Leak',
  streetlight: '💡 Streetlights',
  road_safety: '⚠️ Road Safety',
  vandalism: '🚧 Vandalism',
  flooding: '🌊 Flooding',
  noise: '🔊 Noise',
  other: '📋 General Civic',
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
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
  iconSvg,
  accentColor,
  iconBg,
  iconBorder,
}: {
  value: number;
  label: string;
  sublabel: string;
  iconSvg: React.ReactNode;
  accentColor: string;
  iconBg: string;
  iconBorder: string;
}) {
  return (
    <div className="stat-card fade-in">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        <div
          className="stat-icon-wrap"
          style={{ background: iconBg, borderColor: iconBorder }}
          aria-hidden="true"
        >
          {iconSvg}
        </div>
      </div>
      <div className="stat-value" style={{ color: accentColor }}>
        {value}
      </div>
      <div className="stat-desc">
        <span className="stat-desc-dot" style={{ background: accentColor }} />
        <span>{sublabel}</span>
      </div>
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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>
              Submit Civic Incident Report
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              Enter community observations in plain text. Gemini AI will classify, prioritize, and route the ticket.
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
              placeholder="Describe what occurred, hazards observed, affected infrastructure, and severity..."
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
              placeholder="e.g. Corner of Main St & Oak Ave, near municipal library"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={loading}
            />
            <span className="form-hint">Gemini AI also extracts addresses and landmarks directly from your report narrative.</span>
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
              title="Load sample citizen report"
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

// ─── Report Detail Modal (Inspired by Stitch Exploration) ────────────────────

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
      <div className="modal-content modal-content-wide">
        {/* Top Breadcrumb & Status Navigation */}
        <div className="details-top-bar">
          <div className="details-breadcrumb">
            <button className="breadcrumb-back-btn" onClick={onClose}>
              ← Queue
            </button>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-ticket">TICKET #{report.id}</span>
            <span className="breadcrumb-sep">/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {report.analysis?.title ?? 'Incident Record'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {report.isDemo && <span className="badge badge-demo">DEMO</span>}
            {report.analysis && <CategoryTag category={report.analysis.category} />}
            {report.analysis && <UrgencyBadge urgency={report.analysis.urgency} />}
            <StatusBadge status={report.status} />
            <button
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close modal"
              style={{ fontSize: 16, padding: '4px 8px', marginLeft: 4 }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* AI Failure Alert if Applicable */}
        {report.analysisError && (
          <div className="alert alert-warning">
            <span>⚠️</span>
            <div>
              <strong>Gemini AI Notice:</strong> {report.analysisError}
            </div>
          </div>
        )}

        {/* Two-Column Grid Layout (Stitch Image 2 & 3 Pattern) */}
        <div className="details-grid">
          {/* Left Column: Ground Data & Citizen Intake */}
          <div className="details-column">
            {/* Primary Critical Dispatch Header Block */}
            <div className="dispatch-hero-block">
              <div className="dispatch-micro-tag">
                PRIMARY DISPATCH · TRIAGE TICKET #{report.id}
              </div>
              <h2 className="dispatch-main-title font-display">
                {report.analysis?.title ?? 'Unanalysed Incident Report'}
              </h2>
              <div className="dispatch-meta-strip">
                <span>👤 Citizen Inbound Intake</span>
                <span>·</span>
                <span>📍 {report.analysis?.extractedLocation ?? report.location ?? 'Location unassigned'}</span>
                <span>·</span>
                <span>🕒 Logged: {formatDate(report.createdAt)}</span>
              </div>
            </div>

            {/* Extracted Spatial Landmark Card */}
            <div className="stitch-card">
              <div className="stitch-card-header">
                <div className="stitch-card-title-group">
                  <div className="stitch-card-icon-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div>
                    <div className="stitch-card-title">Extracted Spatial Landmark</div>
                  </div>
                </div>
                <span className="stitch-card-badge">Resolved via Gemini</span>
              </div>

              <div className="spatial-anchor-grid">
                <div className="spatial-meta-item">
                  <span className="spatial-meta-label">TARGET LOCATION</span>
                  <span className="spatial-meta-val">
                    {report.analysis?.extractedLocation ?? report.location ?? 'No address extracted'}
                  </span>
                </div>
                <div className="spatial-meta-item">
                  <span className="spatial-meta-label">REPORT CONTEXT</span>
                  <span className="spatial-meta-val">
                    {report.location ? `Landmark: ${report.location}` : 'Extracted from description text'}
                  </span>
                </div>
              </div>
            </div>

            {/* Original Citizen Field Report Card */}
            <div className="stitch-card">
              <div className="stitch-card-header">
                <div className="stitch-card-title-group">
                  <div className="stitch-card-icon-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="stitch-card-title">Original Citizen Field Report</div>
                  </div>
                </div>
                <span className="stitch-card-badge">Raw Inbound Intact</span>
              </div>

              <div className="citizen-quote-box">
                &ldquo;{report.rawDescription}&rdquo;
              </div>

              {report.location && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📍 Citizen noted location:</span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{report.location}</span>
                </div>
              )}
            </div>

            {/* Duplicate Detection Card (if duplicates exist) */}
            {duplicates.length > 0 && (
              <div className="stitch-card" style={{ borderColor: 'var(--coral-border)' }}>
                <div className="stitch-card-header">
                  <div className="stitch-card-title-group">
                    <div className="stitch-card-icon-box" style={{ background: 'var(--coral-bg)', borderColor: 'var(--coral-border)', color: '#f87171' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="6" y1="3" x2="6" y2="15" />
                        <circle cx="18" cy="6" r="3" />
                        <circle cx="6" cy="18" r="3" />
                        <path d="M18 9a9 9 0 0 1-9 9" />
                      </svg>
                    </div>
                    <div>
                      <div className="stitch-card-title" style={{ color: '#fca5a5' }}>
                        Duplicate Detection &amp; Spatial Grouping
                      </div>
                    </div>
                  </div>
                  <span className="stitch-card-badge" style={{ background: 'var(--coral-bg)', color: '#fca5a5' }}>
                    Advisory Cluster ({duplicates.length})
                  </span>
                </div>

                <ul style={{ paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {duplicates.map((d) => (
                    <li key={d.id} style={{ marginTop: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {d.analysis?.title ?? d.rawDescription.slice(0, 50) + '…'}
                      </span>{' '}
                      <span style={{ color: 'var(--text-muted)' }}>({d.id})</span>
                    </li>
                  ))}
                </ul>
                <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Advisory deduplication flagged to assist municipal operators in correlating related complaints.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Gemini AI Triage, Recommended Protocol & Status Controls */}
          <div className="details-column">
            {/* Gemini AI Triage Card */}
            {report.analysis && (
              <div className="stitch-card">
                <div className="stitch-card-header">
                  <div className="stitch-card-title-group">
                    <div className="stitch-card-icon-box">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l2.4 7.2L21 12l-6.6 2.8L12 22l-2.4-7.2L3 12l6.6-2.8z" />
                      </svg>
                    </div>
                    <div className="stitch-card-title">Gemini AI Triage</div>
                  </div>
                  <span className="stitch-card-badge" style={{ color: 'var(--teal-300)' }}>Active Analysis</span>
                </div>

                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>
                    IDENTIFIED HAZARD CLASSIFICATION
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {CATEGORY_LABELS[report.analysis.category]}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 4 }}>
                    SYNTHESIZED HAZARD BRIEF
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                    {report.analysis.summary}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)' }}>
                    URGENCY RATING
                  </span>
                  <UrgencyBadge urgency={report.analysis.urgency} />
                </div>
              </div>
            )}

            {/* Recommended Protocol Card */}
            {report.analysis && (
              <div className="stitch-card">
                <div className="stitch-card-header">
                  <div className="stitch-card-title-group">
                    <div className="stitch-card-icon-box">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                    </div>
                    <div className="stitch-card-title">Recommended Protocol</div>
                  </div>
                </div>

                <div className="protocol-action-box">
                  <div className="protocol-action-label">
                    <span>⚡</span>
                    <span>Action Protocol</span>
                  </div>
                  <p className="protocol-action-text">
                    {report.analysis.recommendedAction}
                  </p>
                </div>

                {report.analysis.keyEvidence.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 6 }}>
                      KEY DIAGNOSTIC EVIDENCE
                    </div>
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

            {/* Department Assignment Card */}
            {report.analysis && (
              <div className="stitch-card">
                <div className="stitch-card-header">
                  <div className="stitch-card-title-group">
                    <div className="stitch-card-icon-box">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9.5L12 3l9 6.5" />
                        <path d="M4 10h16" />
                        <path d="M6 10v7" />
                        <path d="M10 10v7" />
                        <path d="M14 10v7" />
                        <path d="M18 10v7" />
                        <path d="M3 17h18" />
                      </svg>
                    </div>
                    <div className="stitch-card-title">Department Assignment</div>
                  </div>
                  <span className="stitch-card-badge" style={{ color: 'var(--teal-300)' }}>AUTO-ASSIGNED</span>
                </div>

                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 2 }}>
                    ACTIVE RESPONSIBLE AGENCY
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                    🏛️ {report.analysis.suggestedDepartment}
                  </div>
                </div>
              </div>
            )}

            {/* Incident Status Controls Card (Image 3 Bottom-Right Pattern) */}
            <div className="stitch-card">
              <div className="stitch-card-header">
                <div className="stitch-card-title-group">
                  <div className="stitch-card-icon-box">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" y1="21" x2="4" y2="14" />
                      <line x1="4" y1="10" x2="4" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12" y2="3" />
                      <line x1="20" y1="21" x2="20" y2="16" />
                      <line x1="20" y1="12" x2="20" y2="3" />
                      <line x1="1" y1="14" x2="7" y2="14" />
                      <line x1="9" y1="8" x2="15" y2="8" />
                      <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                  </div>
                  <div className="stitch-card-title">Incident Status Controls</div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-dim)', marginBottom: 8 }}>
                  LIFECYCLE STAGE
                </div>
                <div className="lifecycle-controls-grid">
                  {(['new', 'acknowledged', 'in_progress', 'resolved'] as ReportStatus[]).map((s) => (
                    <button
                      key={s}
                      id={`status-btn-${s}`}
                      className={`lifecycle-btn ${report.status === s ? 'active' : ''}`}
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
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Report Card Component (Stitch Dashboard Grid) ───────────────────────────

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
      {/* Restrained urgency indicator bar on left */}
      {report.analysis && (
        <div className={`report-card-urgency-indicator ${urgencyClass}`} />
      )}

      {/* Badges header row */}
      <div className="report-card-header">
        <div className="report-card-badges">
          {report.analysis && <CategoryTag category={report.analysis.category} />}
          {report.isDemo && <span className="badge badge-demo">DEMO</span>}
          {report.isUnanalysed && <span className="badge badge-unanalysed">UNANALYSED</span>}
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

      {/* Summary excerpt */}
      {report.analysis?.summary && (
        <p className="report-card-summary">
          {report.analysis.summary}
        </p>
      )}

      {/* Potential duplicate detection callout if flagged */}
      {report.duplicateSuggestions.length > 0 && (
        <div className="duplicate-callout-box">
          <span aria-hidden="true">🗩</span>
          <span>{report.duplicateSuggestions.length} potential duplicate detected</span>
        </div>
      )}

      {/* Suggested department micro-tag */}
      {report.analysis?.suggestedDepartment && (
        <div>
          <span className="agency-pill">
            🏛️ {report.analysis.suggestedDepartment}
          </span>
        </div>
      )}

      {/* Card footer metadata */}
      <div className="report-card-meta">
        <span
          className="report-meta-location"
          title={report.analysis?.extractedLocation ?? report.location ?? 'No location specified'}
        >
          📍 {report.analysis?.extractedLocation ?? report.location ?? 'Location unassigned'}
        </span>
        <span className="report-meta-date">{formatDate(report.createdAt)}</span>
      </div>
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        ? '⚠️ Report saved (AI analysis notice — review details)'
        : '✅ Report submitted and triaged with Gemini!'
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

  // Filtered & sorted reports (critical first, then newest)
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
      {/* Refined Civic Header with Stitch Architecture Badge */}
      <header className="header">
        <div className="container header-inner">
          <div className="brand-wrapper">
            {/* Civic-building / grid-inspired geometric SVG logo */}
            <div className="brand-logo-badge" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9.5L12 3l9 6.5" />
                <path d="M4 10h16" />
                <path d="M6 10v7" />
                <path d="M10 10v7" />
                <path d="M14 10v7" />
                <path d="M18 10v7" />
                <path d="M3 17h18" />
                <path d="M2 20h20" />
              </svg>
            </div>
            <div className="brand-text">
              <div className="brand-title">
                <span>CivicLens</span>
                <span className="brand-tag">AI</span>
              </div>
              <div className="brand-sub">MUNICIPAL INCIDENT TRIAGE &amp; OPERATIONS</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="header-view-pill">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal-400)' }} />
              Incident Triage
            </span>

            <button
              id="load-sample-header-btn"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const sampleExists = reports.some((r) => r.isDemo);
                if (!sampleExists) {
                  setReports((prev) => [...SAMPLE_REPORTS, ...prev.filter((r) => !r.isDemo)]);
                  showToast('📌 Demonstration dataset loaded!');
                } else {
                  showToast('ℹ️ Demonstration dataset already loaded.');
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

        {/* Operational Center Strip (Google Stitch Reference Inspired) */}
        <section className="operational-center-strip" aria-label="Incident Triage Overview">
          <div className="operational-meta-tag">
            <span>OPERATIONAL CENTER</span>
            <span className="meta-dot">·</span>
            <span>GEMINI 1.5 PRO ENGINE</span>
            <span className="meta-dot">·</span>
            <span className="meta-cluster">CLUSTER ID: MUNI-HQ-01</span>
          </div>
          <div className="operational-heading-row">
            <div>
              <h1 className="operational-title font-display">
                Incident Dispatch &amp; Operational Intelligence
              </h1>
              <p className="operational-subtitle">
                Real-time citizen reporting intake, automated Gemini classification, and municipal field routing.
              </p>
            </div>
            <div className="operational-status-box">
              <div className="status-box-header">
                <span className="status-live-dot" />
                <span>TRIAGE ACTIVE</span>
              </div>
              <div className="status-box-sub">
                <strong>{stats.unresolved}</strong> Pending Action
              </div>
            </div>
          </div>
        </section>

        {/* Summary Metrics Cards */}
        <section className="stats-grid" aria-label="Incident Summary Metrics">
          <StatCard
            value={stats.total}
            label="TOTAL INCIDENTS"
            sublabel="All logged civic records"
            accentColor="#38bdf8"
            iconBg="rgba(14, 165, 233, 0.12)"
            iconBorder="rgba(14, 165, 233, 0.32)"
            iconSvg={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
          <StatCard
            value={stats.unresolved}
            label="NEEDS ACTION"
            sublabel="Awaiting municipal resolution"
            accentColor="#fbbf24"
            iconBg="rgba(245, 158, 11, 0.12)"
            iconBorder="rgba(245, 158, 11, 0.32)"
            iconSvg={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
              </svg>
            }
          />
          <StatCard
            value={stats.highPriority}
            label="HIGH / CRITICAL"
            sublabel="Immediate triage queue"
            accentColor="#f87171"
            iconBg="rgba(239, 68, 68, 0.12)"
            iconBorder="rgba(239, 68, 68, 0.32)"
            iconSvg={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
          <StatCard
            value={stats.resolved}
            label="RESOLVED"
            sublabel="Completed interventions"
            accentColor="#34d399"
            iconBg="rgba(16, 185, 129, 0.12)"
            iconBorder="rgba(16, 185, 129, 0.32)"
            iconSvg={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            }
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

        {/* Feed Stream Status Bar */}
        <div className="feed-meta-bar">
          <div className="feed-stream-indicator">
            <span style={{ color: 'var(--teal-400)' }}>●</span>
            <span>Showing {filteredReports.length} of {reports.length} incidents</span>
            <span style={{ color: 'var(--text-dim)' }}>·</span>
            <span style={{ color: 'var(--text-muted)' }}>Live citizen intake queue</span>
          </div>
          <div className="feed-sort-indicator">
            <span>≡</span>
            <span>Sort: Priority Rank (High to Low)</span>
          </div>
        </div>

        {/* Reports Feed Grid / Empty State */}
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
