/**
 * SubmitPage — artifact submission form
 * No auth. Username is the only identity token.
 * On success: renders ExportPanel inline so the user can immediately export.
 */
import { useState, useRef } from "react";
import { ARTIFACT_TYPES, ARTIFACT_LABELS } from "@/types";
import type { ArtifactType, Submission } from "@/types";
import { createSubmission, ApiError } from "@/lib/api";
import { ExportPanel } from "@/components/ExportPanel";
import { Link } from "react-router-dom";
import { Send, ArrowLeft } from "lucide-react";

// ─── Validation (mirrors Worker rules exactly) ─────────────────────────────────

interface FormErrors {
  username?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string;
}

function validate(fields: {
  username: string;
  title: string;
  description: string;
  content: string;
  tags: string;
}): FormErrors {
  const errors: FormErrors = {};
  if (!fields.username || fields.username.length < 2 || fields.username.length > 32)
    errors.username = "Username must be 2–32 characters.";
  else if (!/^[a-zA-Z0-9_-]+$/.test(fields.username))
    errors.username = "Letters, numbers, underscores, and hyphens only.";
  if (!fields.title || fields.title.length < 3 || fields.title.length > 80)
    errors.title = "Title must be 3–80 characters.";
  if (!fields.description || fields.description.length < 10 || fields.description.length > 500)
    errors.description = "Description must be 10–500 characters.";
  if (!fields.content || fields.content.length < 1 || fields.content.length > 32_000)
    errors.content = "Content must be 1–32,000 characters.";
  const tagList = fields.tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tagList.length > 8)
    errors.tags = "Maximum 8 tags.";
  return errors;
}

// ─── Field components ──────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--space-2) var(--space-3)",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-surface-2)",
  color: "var(--color-text)",
  fontSize: "var(--text-sm)",
  lineHeight: 1.5,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-sm)",
  fontWeight: 600,
  marginBottom: "var(--space-1)",
  color: "var(--color-text)",
};

const errorStyle: React.CSSProperties = {
  fontSize: "var(--text-xs)",
  color: "var(--color-error)",
  marginTop: "var(--space-1)",
};

const fieldWrap: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
};

// ─── Page ───────────────────────────────────────────────────────────────────

export function SubmitPage() {
  const [username, setUsername] = useState("");
  const [type, setType] = useState<ArtifactType>(".prompts");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [result, setResult] = useState<Submission | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const fieldValues = { username, title, description, content, tags };
    const fieldErrors = validate(fieldValues);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    setErrors({});

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setSubmitting(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 8);

      const submission = await createSubmission(
        { username, type, title, description, content, tags: tagList },
        abortRef.current.signal
      );
      setResult(submission);
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setResult(null);
    setTitle("");
    setDescription("");
    setContent("");
    setTags("");
    setErrors({});
    setServerError(null);
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (result) {
    return (
      <main id="main-content" className="page-shell">
        <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
          <div
            style={{
              padding: "var(--space-4)",
              borderRadius: "var(--radius-lg)",
              backgroundColor: "var(--color-success-highlight)",
              color: "var(--color-success)",
              marginBottom: "var(--space-6)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
            }}
          >
            ✓ Submitted successfully as <strong>{result.username}</strong>
          </div>

          <h1
            style={{
              fontSize: "var(--text-xl)",
              marginBottom: "var(--space-1)",
              fontFamily: "var(--font-display)",
            }}
          >
            {result.title}
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-muted)",
              marginBottom: "var(--space-6)",
            }}
          >
            {ARTIFACT_LABELS[result.type]} · {result.tags.join(", ")}
          </p>

          <ExportPanel submission={result} />

          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              marginTop: "var(--space-6)",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleReset}
              style={{
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface-offset)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--color-text)",
              }}
            >
              Submit another
            </button>
            <Link
              to={`/s/${result.id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "var(--space-2) var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-primary)",
                color: "var(--color-text-inverse)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              View artifact →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <main id="main-content" className="page-shell">
      <div style={{ maxWidth: "var(--content-narrow)", margin: "0 auto" }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
            textDecoration: "none",
            marginBottom: "var(--space-6)",
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" /> Browse
        </Link>

        <h1
          style={{
            fontSize: "var(--text-xl)",
            fontFamily: "var(--font-display)",
            marginBottom: "var(--space-2)",
          }}
        >
          Submit an artifact
        </h1>
        <p
          style={{
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
            marginBottom: "var(--space-8)",
          }}
        >
          Share a prompt, skill, agent, chain, tool, or persona with the community.
          No account required.
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}
        >
          {/* Username */}
          <div style={fieldWrap}>
            <label htmlFor="username" style={labelStyle}>
              Username <span aria-hidden="true" style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_handle"
              maxLength={32}
              aria-describedby={errors.username ? "username-err" : undefined}
              aria-invalid={!!errors.username}
              style={inputStyle}
            />
            {errors.username && (
              <span id="username-err" role="alert" style={errorStyle}>
                {errors.username}
              </span>
            )}
          </div>

          {/* Type */}
          <div style={fieldWrap}>
            <label htmlFor="type" style={labelStyle}>
              Type <span aria-hidden="true" style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as ArtifactType)}
              style={inputStyle}
            >
              {ARTIFACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ARTIFACT_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={fieldWrap}>
            <label htmlFor="title" style={labelStyle}>
              Title <span aria-hidden="true" style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="A short, descriptive title"
              maxLength={80}
              aria-describedby={errors.title ? "title-err" : undefined}
              aria-invalid={!!errors.title}
              style={inputStyle}
            />
            {errors.title && (
              <span id="title-err" role="alert" style={errorStyle}>
                {errors.title}
              </span>
            )}
          </div>

          {/* Description */}
          <div style={fieldWrap}>
            <label htmlFor="description" style={labelStyle}>
              Description <span aria-hidden="true" style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this artifact do? Who is it for?"
              rows={3}
              maxLength={500}
              aria-describedby={errors.description ? "description-err" : undefined}
              aria-invalid={!!errors.description}
              style={{ ...inputStyle, resize: "vertical", minHeight: "4.5rem" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "var(--space-1)",
              }}
            >
              {errors.description ? (
                <span id="description-err" role="alert" style={errorStyle}>
                  {errors.description}
                </span>
              ) : (
                <span />
              )}
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color:
                    description.length > 480
                      ? "var(--color-warning)"
                      : "var(--color-text-faint)",
                }}
              >
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Tags */}
          <div style={fieldWrap}>
            <label htmlFor="tags" style={labelStyle}>
              Tags
              <span
                style={{
                  marginLeft: "var(--space-2)",
                  fontWeight: 400,
                  color: "var(--color-text-muted)",
                  fontSize: "var(--text-xs)",
                }}
              >
                (comma-separated, max 8)
              </span>
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="coding, python, summarization"
              aria-describedby={errors.tags ? "tags-err" : undefined}
              aria-invalid={!!errors.tags}
              style={inputStyle}
            />
            {errors.tags && (
              <span id="tags-err" role="alert" style={errorStyle}>
                {errors.tags}
              </span>
            )}
          </div>

          {/* Content */}
          <div style={fieldWrap}>
            <label htmlFor="content" style={labelStyle}>
              Content <span aria-hidden="true" style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your prompt, skill definition, agent config, etc."
              rows={12}
              maxLength={32_000}
              aria-describedby={errors.content ? "content-err" : undefined}
              aria-invalid={!!errors.content}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: "14rem",
                fontFamily: "monospace",
                fontSize: "var(--text-xs)",
                lineHeight: 1.65,
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "var(--space-1)",
              }}
            >
              {errors.content ? (
                <span id="content-err" role="alert" style={errorStyle}>
                  {errors.content}
                </span>
              ) : (
                <span />
              )}
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color:
                    content.length > 30_000
                      ? "var(--color-warning)"
                      : "var(--color-text-faint)",
                }}
              >
                {content.length.toLocaleString()}/32,000
              </span>
            </div>
          </div>

          {/* Server error */}
          {serverError && (
            <div
              role="alert"
              style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-error-highlight)",
                color: "var(--color-error)",
                fontSize: "var(--text-sm)",
              }}
            >
              {serverError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            aria-disabled={submitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-2)",
              padding: "var(--space-3) var(--space-6)",
              borderRadius: "var(--radius-md)",
              backgroundColor: submitting
                ? "var(--color-primary-highlight)"
                : "var(--color-primary)",
              color: submitting
                ? "var(--color-primary)"
                : "var(--color-text-inverse)",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              alignSelf: "flex-start",
              cursor: submitting ? "not-allowed" : "pointer",
              border: "none",
              minWidth: "8rem",
            }}
          >
            <Send size={15} aria-hidden="true" />
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </main>
  );
}
