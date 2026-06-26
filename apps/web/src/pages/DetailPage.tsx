import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubmission } from '@/lib/api';
import { generateAll, downloadArtifact, copyToClipboard } from '@/lib/generators';
import type { Submission, GeneratedArtifact } from '@/types';
import { ARTIFACT_LABELS } from '@/types';

function ExportPanel({ sub }: { sub: Submission }) {
  const [artifacts] = useState<GeneratedArtifact[]>(() =>
    generateAll({
      username: sub.username,
      type: sub.type,
      title: sub.title,
      description: sub.description ?? '',
      content: sub.content,
      tags: sub.tags,
    })
  );
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(artifacts[active]?.content ?? '');
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 1800); }
  }

  return (
    <section className="export-panel" aria-label="Export artifact">
      <div className="export-header">
        <h2>Export</h2>
        <div className="preview-tabs" role="tablist" aria-label="Export format">
          {artifacts.map((a, i) => (
            <button
              key={a.format}
              role="tab"
              aria-selected={active === i}
              className={`tab-btn${active === i ? ' active' : ''}`}
              onClick={() => setActive(i)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <pre className="preview-pane" tabIndex={0} aria-live="polite">
        <code>{artifacts[active]?.content}</code>
      </pre>

      <div className="export-actions">
        <button className="btn btn-ghost" onClick={handleCopy} aria-live="polite">
          {copied ? '✓ Copied' : 'Copy to clipboard'}
        </button>
        <button
          className="btn btn-primary"
          onClick={() => downloadArtifact(artifacts[active])}
        >
          Download {artifacts[active]?.filename}
        </button>
      </div>
    </section>
  );
}

export function DetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sub, setSub] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!id) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    getSubmission(id, ctrl.signal)
      .then(setSub)
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Failed to load artifact.');
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [id]);

  if (loading) {
    return (
      <main id="main-content" className="page-shell detail-page">
        <div className="detail-skeleton" aria-label="Loading artifact">
          <div className="skeleton" style={{ height: '0.75rem', width: '20%', marginBottom: 'var(--space-3)' }} />
          <div className="skeleton" style={{ height: '2rem', width: '60%', marginBottom: 'var(--space-4)' }} />
          <div className="skeleton" style={{ height: '1rem', width: '90%', marginBottom: 'var(--space-2)' }} />
          <div className="skeleton" style={{ height: '1rem', width: '75%', marginBottom: 'var(--space-8)' }} />
          <div className="skeleton" style={{ height: '280px', width: '100%' }} />
        </div>
      </main>
    );
  }

  if (error || !sub) {
    return (
      <main id="main-content" className="page-shell detail-page">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4m0 4h.01"/>
            </svg>
          </div>
          <h1>{error ? 'Something went wrong' : 'Artifact not found'}</h1>
          <p>{error ?? 'This artifact may have been removed or the link is invalid.'}</p>
          <Link to="/" className="btn btn-primary">Browse artifacts</Link>
        </div>
      </main>
    );
  }

  const dateStr = new Date(sub.createdAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <main id="main-content" className="page-shell detail-page">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/">Browse</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{sub.title}</span>
      </nav>

      {/* Hero header */}
      <header className="detail-header">
        <div className="detail-meta">
          <span className="type-badge large">{ARTIFACT_LABELS[sub.type]}</span>
          <time dateTime={sub.createdAt} className="card-date">{dateStr}</time>
        </div>
        <h1 className="detail-title">{sub.title}</h1>
        {sub.description && <p className="detail-desc">{sub.description}</p>}
        <p className="card-author">by @{sub.username}</p>
        {sub.tags.length > 0 && (
          <ul className="card-tags detail-tags" aria-label="Tags">
            {sub.tags.map((t) => <li key={t} className="tag-chip">{t}</li>)}
          </ul>
        )}
      </header>

      {/* Raw content viewer */}
      <section className="content-viewer" aria-label="Raw artifact content">
        <h2>Content</h2>
        <pre tabIndex={0}><code>{sub.content}</code></pre>
      </section>

      {/* Export panel */}
      <ExportPanel sub={sub} />
    </main>
  );
}
