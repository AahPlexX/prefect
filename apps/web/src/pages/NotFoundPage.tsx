import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main id="main-content" className="page-shell">
      <div className="empty-state">
        <div className="empty-state-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9.172 16.172a4 4 0 0 1 5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
          </svg>
        </div>
        <h1>404 — Not Found</h1>
        <p>This page doesn't exist. Head back and explore artifacts.</p>
        <Link to="/" className="btn btn-primary">Go home</Link>
      </div>
    </main>
  );
}
