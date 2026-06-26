import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listSubmissions } from '@/lib/api';
import type { Submission, ArtifactType } from '@/types';
import { ARTIFACT_TYPES, ARTIFACT_LABELS } from '@/types';

const ALL = 'all' as const;
type Filter = ArtifactType | typeof ALL;

function SkeletonCard() {
  return (
    <div className="artifact-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-text" style={{ width: '40%', height: '0.75rem' }} />
      <div className="skeleton skeleton-heading" style={{ width: '70%' }} />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" style={{ width: '60%' }} />
    </div>
  );
}

function ArtifactCard({ sub }: { sub: Submission }) {
  const dateStr = new Date(sub.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <Link to={`/s/${sub.id}`} className="artifact-card" aria-label={`View ${sub.title} by ${sub.username}`}>
      <div className="card-meta">
        <span className="type-badge">{ARTIFACT_LABELS[sub.type]}</span>
        <span className="card-date">{dateStr}</span>
      </div>
      <h2 className="card-title">{sub.title}</h2>
      {sub.description && <p className="card-desc">{sub.description}</p>}
      <div className="card-footer">
        <span className="card-author">@{sub.username}</span>
        {sub.tags.length > 0 && (
          <ul className="card-tags" aria-label="Tags">
            {sub.tags.slice(0, 4).map((t) => <li key={t} className="tag-chip small">{t}</li>)}
          </ul>
        )}
      </div>
    </Link>
  );
}

export function BrowsePage() {
  const [filter, setFilter] = useState<Filter>(ALL);
  const [items, setItems] = useState<Submission[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (type: Filter, cur?: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const res = await listSubmissions(
        { type: type === ALL ? undefined : type, limit: 20, cursor: cur },
        ctrl.signal,
      );
      setItems((prev) => cur ? [...prev, ...res.items] : res.items);
      setCursor(res.cursor);
      setHasMore(res.hasMore);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to load submissions.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
    load(filter);
    return () => abortRef.current?.abort();
  }, [filter, load]);

  const FILTERS: Array<{ value: Filter; label: string }> = [
    { value: ALL, label: 'All' },
    ...ARTIFACT_TYPES.map((t) => ({ value: t, label: ARTIFACT_LABELS[t] })),
  ];

  return (
    <main id="main-content" className="page-shell browse-page">
      <div className="browse-header">
        <h1>Browse Artifacts</h1>
        <p className="page-sub">Community-submitted prompts, skills, agents, and workflows.</p>
      </div>

      {/* Type filter tabs */}
      <nav aria-label="Filter by type" className="filter-bar">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            className={`filter-tab${filter === value ? ' active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Error */}
      {error && (
        <div className="error-banner" role="alert">
          <p>{error}</p>
          <button className="btn btn-ghost" onClick={() => load(filter, undefined)}>
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      <div
        className="artifacts-grid"
        aria-label="Artifacts"
        aria-busy={loading}
      >
        {loading && items.length === 0
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : items.map((sub) => <ArtifactCard key={sub.id} sub={sub} />)}
      </div>

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 12h6M9 16h4M7 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8l-5-5H7Z"/>
              <path d="M13 3v5h5"/>
            </svg>
          </div>
          <h2>No artifacts yet</h2>
          <p>Be the first to submit a {filter === ALL ? '' : ARTIFACT_LABELS[filter as ArtifactType] + ' '}artifact.</p>
          <Link to="/submit" className="btn btn-primary">Submit one</Link>
        </div>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <div className="load-more-wrap">
          <button
            className="btn btn-ghost"
            onClick={() => load(filter, cursor)}
          >
            Load more
          </button>
        </div>
      )}
      {loading && items.length > 0 && (
        <p className="loading-more" aria-live="polite">Loading…</p>
      )}
    </main>
  );
}
