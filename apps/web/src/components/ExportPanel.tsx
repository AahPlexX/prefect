/**
 * ExportPanel — shared artifact export UI
 * Renders download + copy buttons for all three formats (MD / JSON / TXT).
 * Pure presentational: receives a Submission, calls generators internally.
 * No API imports. No side-effect state outside this component.
 */
import { useState, useMemo } from "react";
import type { Submission } from "@/types";
import {
  generateAll,
  downloadArtifact,
  copyToClipboard,
} from "@/lib/generators";
import { Download, Copy, Check } from "lucide-react";

type FormatKey = "markdown" | "json" | "text";

const FORMAT_LABELS: Record<FormatKey, { label: string; ext: string }> = {
  markdown: { label: "Markdown", ext: ".md" },
  json:     { label: "JSON",     ext: ".json" },
  text:     { label: "Plain text", ext: ".txt" },
};

interface ExportPanelProps {
  submission: Submission;
}

export function ExportPanel({ submission }: ExportPanelProps) {
  const artifacts = useMemo(() => generateAll(submission), [submission]);
  const [copiedKey, setCopiedKey] = useState<FormatKey | null>(null);

  async function handleCopy(key: FormatKey) {
    const success = await copyToClipboard(artifacts[key]);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    }
  }

  function handleDownload(key: FormatKey) {
    downloadArtifact(artifacts[key]);
  }

  return (
    <section
      aria-label="Export artifact"
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <header
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--color-border)",
          fontSize: "var(--text-sm)",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Export
      </header>

      <ul role="list" style={{ listStyle: "none" }}>
        {(Object.keys(FORMAT_LABELS) as FormatKey[]).map((key, i, arr) => {
          const { label, ext } = FORMAT_LABELS[key];
          const isCopied = copiedKey === key;
          const isLast = i === arr.length - 1;

          return (
            <li
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                padding: "var(--space-3) var(--space-4)",
                borderBottom: isLast ? "none" : "1px solid var(--color-divider)",
              }}
            >
              <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
                {label}
                <span
                  style={{
                    marginLeft: "var(--space-2)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-faint)",
                    fontFamily: "monospace",
                  }}
                >
                  {ext}
                </span>
              </span>

              <div style={{ display: "flex", gap: "var(--space-2)", flexShrink: 0 }}>
                {/* Copy */}
                <button
                  onClick={() => handleCopy(key)}
                  aria-label={isCopied ? `${label} copied` : `Copy ${label}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 500,
                    border: "1px solid var(--color-border)",
                    backgroundColor: isCopied
                      ? "var(--color-success-highlight)"
                      : "var(--color-surface-offset)",
                    color: isCopied
                      ? "var(--color-success)"
                      : "var(--color-text-muted)",
                    minWidth: "4.5rem",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  {isCopied
                    ? <><Check size={13} aria-hidden="true" /> Copied</>  
                    : <><Copy size={13} aria-hidden="true" /> Copy</>}
                </button>

                {/* Download */}
                <button
                  onClick={() => handleDownload(key)}
                  aria-label={`Download ${label}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    padding: "var(--space-1) var(--space-3)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "var(--text-xs)",
                    fontWeight: 500,
                    border: "1px solid var(--color-primary)",
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-text-inverse)",
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} aria-hidden="true" />
                  Download
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
