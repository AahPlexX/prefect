/**
 * Prefect — Client-side artifact generators
 * Pure functions: Submission → formatted string output.
 * No imports from api.ts. No side effects except download/clipboard helpers.
 */
import type { Submission, GeneratedArtifact } from "@/types";
import { ARTIFACT_LABELS } from "@/types";

// ─── Sanitization ─────────────────────────────────────────────────────────────

/** Prevent triple-backtick sequences from breaking fenced code blocks in Markdown. */
function sanitizeForFence(str: string): string {
  return str.replace(/```/g, "\\`\\`\\`");
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMarkdown(s: Submission): string {
  const label = ARTIFACT_LABELS[s.type];
  const tagsLine = s.tags.length ? `\n**Tags:** ${s.tags.map((t) => `\`${t}\``).join(", ")}` : "";
  return [
    `# ${s.title}`,
    ``,
    `> **Type:** ${label} (\`${s.type}\`)  `,
    `> **Author:** ${s.username}  `,
    `> **Submitted:** ${new Date(s.createdAt).toUTCString()}  `,
    `> **ID:** \`${s.id}\``,
    tagsLine,
    ``,
    `## Description`,
    ``,
    s.description,
    ``,
    `## Content`,
    ``,
    "```",
    sanitizeForFence(s.content),
    "```",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function formatJSON(s: Submission): string {
  return JSON.stringify(s, null, 2);
}

function formatPlainText(s: Submission): string {
  const label = ARTIFACT_LABELS[s.type];
  const tagsLine = s.tags.length ? `Tags: ${s.tags.join(", ")}` : "";
  return [
    `PREFECT ARTIFACT EXPORT`,
    `${"-".repeat(40)}`,
    `Title:     ${s.title}`,
    `Type:      ${label} (${s.type})`,
    `Author:    ${s.username}`,
    `Submitted: ${new Date(s.createdAt).toUTCString()}`,
    `ID:        ${s.id}`,
    tagsLine,
    `${"-".repeat(40)}`,
    ``,
    `DESCRIPTION`,
    s.description,
    ``,
    `CONTENT`,
    s.content,
  ]
    .filter(Boolean)
    .join("\n");
}

// ─── Public generator functions ───────────────────────────────────────────────

export function generateMarkdown(s: Submission): GeneratedArtifact {
  return {
    filename: `${s.slug}.md`,
    content: formatMarkdown(s),
    mimeType: "text/markdown;charset=utf-8",
  };
}

export function generateJSON(s: Submission): GeneratedArtifact {
  return {
    filename: `${s.slug}.json`,
    content: formatJSON(s),
    mimeType: "application/json;charset=utf-8",
  };
}

export function generatePlainText(s: Submission): GeneratedArtifact {
  return {
    filename: `${s.slug}.txt`,
    content: formatPlainText(s),
    mimeType: "text/plain;charset=utf-8",
  };
}

/** All three formats in one call — used by the export panel. */
export function generateAll(s: Submission): Record<"markdown" | "json" | "text", GeneratedArtifact> {
  return {
    markdown: generateMarkdown(s),
    json: generateJSON(s),
    text: generatePlainText(s),
  };
}

// ─── Download helper ──────────────────────────────────────────────────────────

/**
 * Triggers a browser file download for a GeneratedArtifact.
 * Creates and immediately revokes an object URL to avoid memory leaks.
 */
export function downloadArtifact(artifact: GeneratedArtifact): void {
  const blob = new Blob([artifact.content], { type: artifact.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = artifact.filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on next tick — gives the browser time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ─── Clipboard helper ─────────────────────────────────────────────────────────

/**
 * Copies artifact content to the clipboard.
 * Returns true on success, false if the Clipboard API is unavailable or denied.
 */
export async function copyToClipboard(artifact: GeneratedArtifact): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(artifact.content);
    return true;
  } catch {
    return false;
  }
}
