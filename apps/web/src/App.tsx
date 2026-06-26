import { useState, useEffect, useCallback } from "react";
import { Routes, Route, NavLink } from "react-router-dom";
import { Sun, Moon, Layers } from "lucide-react";
import { BrowsePage } from "@/pages/BrowsePage";
import { SubmitPage } from "@/pages/SubmitPage";

// ------------------------------------------------------------------ //
// Remaining stub pages — DetailPage and NotFound filled next response  //
// ------------------------------------------------------------------ //

function DetailPage() {
  return (
    <main id="main-content" className="page-shell">
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-4)" }}>Artifact</h1>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main id="main-content" className="page-shell">
      <h1 style={{ fontSize: "var(--text-xl)", marginBottom: "var(--space-2)" }}>404</h1>
      <p style={{ color: "var(--color-text-muted)" }}>Page not found.</p>
    </main>
  );
}

// ------------------------------------------------------------------ //
// Theme                                                                //
// ------------------------------------------------------------------ //

type Theme = "light" | "dark";

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    []
  );

  return [theme, toggle];
}

// ------------------------------------------------------------------ //
// Nav                                                                   //
// ------------------------------------------------------------------ //

const linkBase =
  "inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium no-underline";

function navClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? `${linkBase} bg-[var(--color-primary-highlight)] text-[var(--color-primary)]`
    : `${linkBase} text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)]`;
}

function Nav({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <header
      role="banner"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <nav
        aria-label="Main navigation"
        style={{
          maxWidth: "var(--content-wide)",
          margin: "0 auto",
          padding: "0 var(--space-4)",
          height: "3.5rem",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-2)",
        }}
      >
        <NavLink
          to="/"
          aria-label="Prefect — home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginRight: "var(--space-4)",
            textDecoration: "none",
            color: "var(--color-primary)",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: "var(--text-lg)",
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          <Layers size={20} aria-hidden="true" />
          Prefect
        </NavLink>

        <NavLink to="/" end className={navClass}>
          Browse
        </NavLink>
        <NavLink to="/submit" className={navClass}>
          Submit
        </NavLink>

        <div style={{ flex: 1 }} aria-hidden="true" />

        <button
          onClick={onToggle}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "2.25rem",
            height: "2.25rem",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}
        >
          {theme === "dark"
            ? <Sun size={18} aria-hidden="true" />
            : <Moon size={18} aria-hidden="true" />}
        </button>
      </nav>
    </header>
  );
}

// ------------------------------------------------------------------ //
// Root                                                                  //
// ------------------------------------------------------------------ //

export default function App() {
  const [theme, toggleTheme] = useTheme();

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-bg)",
      }}
    >
      <Nav theme={theme} onToggle={toggleTheme} />

      <Routes>
        <Route path="/"       element={<BrowsePage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/s/:id" element={<DetailPage />} />
        <Route path="*"       element={<NotFoundPage />} />
      </Routes>

      <footer
        role="contentinfo"
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--color-border)",
          padding: "var(--space-6) var(--space-4)",
          textAlign: "center",
          fontSize: "var(--text-xs)",
          color: "var(--color-text-faint)",
        }}
      >
        Prefect — open source community artifacts
      </footer>
    </div>
  );
}
