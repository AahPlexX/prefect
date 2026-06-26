/**
 * BrowsePage — paginated artifact grid with type-filter tabs.
 * Aborts in-flight requests on filter change and unmount.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ARTIFACT_TYPES, ARTIFACT_LABELS } from "@/types";
import type { ArtifactType, Submission } from "@/types";
import { listSubmissions, ApiError } from "@/lib/api";
import { ArrowRight } from "lucide-react";

// ─── Skeleton ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      aria-hidden="true"
      style={{
        padding: "var(--space-4)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-surface)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={skeletonBar("40%", "1.125rem")} />
      <div style={skeletonBar("100%", "0.75rem")} />
      <div style={skeletonBar("80%", "0.75rem")} />
      <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
        <div style={skeletonBar("3.5rem", "1.25rem")} />
        <div style={skeletonBar("3.5rem", "1.25rem")} />
      </div>
    </div>
  );
}

function skeletonBar(width: string, height: string): React.CSSProperties {
  return {
    width,
    height,
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-surface-dynamic)",
    animation: "shimmer 1.5s ease-in-out infinite",
  };
}

// ─── Artifact card ──────────────────────────────────────────────────────────

function ArtifactCard({ item }: { item: Submission }) {
  const visibleTags = item.tags.slice(0, 3);
  const extraTags = item.tags.length - visibleTags.length;
  const date = new Date(item.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      to={`/s/${item.id}`}
      style={{ textDecoration: "none", display: "block" }}
    >
      <article
        style={{
          padding: "var(--space-4)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          transition: "box-shadow var(--transition-interactive), border-color var(--transition-interactive)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary-highlight)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
        }}
      >
        {/* Type badge */}
        <span
          style={{
            display: "inline-flex",
            alignSelf: "flex-start",
            padding: "0.125rem var(--space-2)",
            borderRadius: "var(--radius-full)",
            fontSize: "var(--text-xs)",
            fontWeight: 600,
            backgroundColor: "var(--color-primary-highlight)",
            color: "var(--color-primary)",
            letterSpacing: "0.02em",
          }}
        >
          {ARTIFACT_LABELS[item.type]}
        </span>

        {/* Title */}
        <h2
          style={{
            fontSize: "var(--text-base)",
            fontWeight: 700,
            color: "var(--color-text)",
            lineHeight: 1.3,
            fontFamily: "var(--font-display)",
            margin: 0,
          }}
        >
          {item.title}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
            lineHeight: 1.5,
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: "none",
          }}
        >
          {item.description}
        </p>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-2)",
            flexWrap: "wrap",
            marginTop: "var(--space-1)",
          }}
        >
          {/* Tags */}
          <div style={{ display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
            {visibleTags.map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "0.1rem var(--space-2)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-xs)",
                  backgroundColor: "var(--color-surface-offset)",
                  color: "var(--color-text-muted)",
                }}
              >
                {tag}
              </span>
            ))}
            {extraTags > 0 && (
              <span
                style={{
                  padding: "0.1rem var(--space-2)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-faint)",
                }}
              >
                +{extraTags}
              </span>
            )}
          </div>

          {/* Meta */}
          <span
            style={{
              fontSize: "var(--text-xs)",
              color: "var(--color-text-faint)",
              whiteSpace: "nowrap",
            }}
          >
            {item.username} · {date}
          </span>
        </div>
      </article>
    </Link>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

type FilterType = ArtifactType | "all";

export function BrowsePage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [items, setItems] = useState<Submission[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (activeFilter: FilterType, activeCursor?: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const isLoadMore = !!activeCursor;
      isLoadMore ? setLoadingMore(true) : setLoading(true);
      setError(null);

      try {
        const res = await listSubmissions({
          type: activeFilter === "all" ? undefined : activeFilter,
          cursor: activeCursor,
          limit: 12,
          signal: abortRef.current.signal,
        });
        setItems((prev) => (isLoadMore ? [...prev, ...res.items] : res.items));
        setCursor(res.cursor);
      } catch (err) {
        if (err instanceof ApiError) setError(err.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Initial load + filter change
  useEffect(() => {
    setItems([]);
    setCursor(null);
    fetchPage(filter);
    return () => abortRef.current?.abort();
  }, [filter, fetchPage]);

  const tabs: { key: FilterType; label: string }[] = [
    { key: "all", label: "All" },
    ...ARTIFACT_TYPES.map((t) => ({ key: t as FilterType, label: ARTIFACT_LABELS[t] })),
  ];

  const tabBase: React.CSSProperties = {
    padding: "var(--space-1) var(--space-3)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--text-sm)",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <main id="main-content" className="page-shell">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)",
          flexWrap: "wrap",
          marginBottom: "var(--space-6)",
        }}
      >
        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontFamily: "var(--font-display)",
          }}
        >
          Browse
        </h1>
        <Link
          to="/submit"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "var(--space-2) var(--space-4)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-primary)",
            color: "var(--color-text-inverse)",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Submit artifact <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>

      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Filter by type"
        style={{
          display: "flex",
          gap: "var(--space-1)",
          flexWrap: "wrap",
          marginBottom: "var(--space-6)",
        }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            role="tab"
            aria-selected={filter === key}
            onClick={() => setFilter(key)}
            style={{
              ...tabBase,
              backgroundColor:
                filter === key
                  ? "var(--color-primary-highlight)"
                  : "var(--color-surface-offset)",
              color:
                filter === key
                  ? "var(--color-primary)"
                  : "var(--color-text-muted)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "var(--space-3) var(--space-4)",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-error-highlight)",
            color: "var(--color-error)",
            fontSize: "var(--text-sm)",
            marginBottom: "var(--space-6)",
          }}
        >
          {error}
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
          gap: "var(--space-4)",
        }}
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : items.map((item) => <ArtifactCard key={item.id} item={item} />)}
      </div>

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-16) var(--space-8)",
            color: "var(--color-text-muted)",
          }}
        >
          <p style={{ fontSize: "var(--text-lg)", fontWeight: 600, marginBottom: "var(--space-2)", maxWidth: "none" }}>
            Nothing here yet
          </p>
          <p style={{ fontSize: "var(--text-sm)", marginBottom: "var(--space-6)" }}>
            Be the first to share an artifact.
          </p>
          <Link
            to="/submit"
            style={{
              display: "inline-flex",
              padding: "var(--space-2) var(--space-5)",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-text-inverse)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Submit the first one
          </Link>
        </div>
      )}

      {/* Load more */}
      {!loading && cursor && (
        <div style={{ textAlign: "center", marginTop: "var(--space-8)" }}>
          <button
            onClick={() => fetchPage(filter, cursor)}
            disabled={loadingMore}
            style={{
              padding: "var(--space-2) var(--space-6)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface-offset)",
              color: "var(--color-text)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              cursor: loadingMore ? "not-allowed" : "pointer",
            }}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { opacity: 1; }
          50%  { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </main>
  );
}
