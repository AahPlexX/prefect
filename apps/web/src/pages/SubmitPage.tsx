import { useState, useCallback, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSubmission } from '@/lib/api';
import { generateAll, downloadArtifact, copyToClipboard } from '@/lib/generators';
import type { ArtifactType, SubmissionInput, GeneratedArtifact } from '@/types';
import { ARTIFACT_TYPES, ARTIFACT_LABELS } from '@/types';

const USERNAME_RE = /^[a-zA-Z0-9_-]{2,32}$/;
const TITLE_MAX = 80;
const DESC_MAX = 300;
const CONTENT_MAX = 12000;

type Field = 'username' | 'title' | 'description' | 'content' | 'tags';
type Errors = Partial<Record<Field | 'submit', string>>;

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const commit = useCallback(() => {
    const val = draft.trim().toLowerCase().replace(/\s+/g, '-');
    if (val && !tags.includes(val) && tags.length < 8) {
      onChange([...tags, val]);
    }
    setDraft('');
  }, [draft, tags, onChange]);

  return (
    <div className="tag-input-wrap">
      <div className="tag-list" aria-live="polite">
        {tags.map((t) => (
          <span key={t} className="tag-chip">
            {t}
            <button
              type="button"
              aria-label={`Remove tag ${t}`}
              onClick={() => onChange(tags.filter((x) => x !== t))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        placeholder="Add tag, press Enter…"
        value={draft}
        maxLength={24}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
      <p className="field-hint">Up to 8 tags · press Enter or comma to add</p>
    </div>
  );
}

export function SubmitPage() {
  const nav = useNavigate();
  const formId = useId();

  const [username, setUsername] = useState('');
  const [type, setType] = useState<ArtifactType>('.skills');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'preview' | 'done'>('idle');
  const [preview, setPreview] = useState<GeneratedArtifact[]>([]);
  const [activeArtifact, setActiveArtifact] = useState(0);
  const [copied, setCopied] = useState(false);

  function validate(): Errors {
    const e: Errors = {};
    if (!USERNAME_RE.test(username))
      e.username = 'Username must be 2–32 chars: letters, numbers, _ or -';
    if (!title.trim() || title.length > TITLE_MAX)
      e.title = `Title is required and must be under ${TITLE_MAX} chars`;
    if (description.length > DESC_MAX)
      e.description = `Description must be under ${DESC_MAX} chars`;
    if (!content.trim() || content.length > CONTENT_MAX)
      e.content = `Content is required and must be under ${CONTENT_MAX} chars`;
    return e;
  }

  async function handlePreview() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    const input: SubmissionInput = { username, type, title, description, content, tags };
    setPreview(generateAll(input));
    setStatus('preview');
  }

  async function handleSubmit() {
    setStatus('submitting');
    try {
      const input: SubmissionInput = { username, type, title, description, content, tags };
      const sub = await createSubmission(input);
      setStatus('done');
      setTimeout(() => nav(`/s/${sub.id}`), 1200);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : 'Submission failed. Try again.' });
      setStatus('preview');
    }
  }

  async function handleCopy() {
    const ok = await copyToClipboard(preview[activeArtifact]?.content ?? '');
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  if (status === 'done') {
    return (
      <main id="main-content" className="page-shell submit-done" aria-live="polite">
        <div className="done-card">
          <span className="done-icon" aria-hidden="true">✓</span>
          <h1>Submitted!</h1>
          <p>Redirecting to your artifact…</p>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell submit-page">
      <div className="submit-layout">
        {/* ── FORM ── */}
        <section className="submit-form-col" aria-labelledby={`${formId}-heading`}>
          <h1 id={`${formId}-heading`}>Submit an Artifact</h1>
          <p className="page-sub">Share a prompt, skill, agent, or workflow — no account needed.</p>

          <form
            noValidate
            onSubmit={(e) => { e.preventDefault(); handlePreview(); }}
            aria-label="Artifact submission form"
          >
            {/* Username */}
            <div className="field-group">
              <label htmlFor={`${formId}-username`}>Your name <span aria-hidden="true">*</span></label>
              <input
                id={`${formId}-username`}
                type="text"
                autoComplete="username"
                placeholder="e.g. leastman"
                value={username}
                maxLength={32}
                onChange={(e) => setUsername(e.target.value)}
                aria-describedby={errors.username ? `${formId}-username-err` : undefined}
                aria-invalid={!!errors.username}
                required
              />
              {errors.username && (
                <p id={`${formId}-username-err`} className="field-error" role="alert">{errors.username}</p>
              )}
            </div>

            {/* Type */}
            <div className="field-group">
              <label htmlFor={`${formId}-type`}>Type <span aria-hidden="true">*</span></label>
              <select
                id={`${formId}-type`}
                value={type}
                onChange={(e) => setType(e.target.value as ArtifactType)}
              >
                {ARTIFACT_TYPES.map((t) => (
                  <option key={t} value={t}>{ARTIFACT_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="field-group">
              <label htmlFor={`${formId}-title`}>Title <span aria-hidden="true">*</span></label>
              <input
                id={`${formId}-title`}
                type="text"
                placeholder="Give your artifact a clear name"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                aria-describedby={errors.title ? `${formId}-title-err` : `${formId}-title-hint`}
                aria-invalid={!!errors.title}
                required
              />
              <p id={`${formId}-title-hint`} className="field-hint char-count">
                {title.length}/{TITLE_MAX}
              </p>
              {errors.title && (
                <p id={`${formId}-title-err`} className="field-error" role="alert">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="field-group">
              <label htmlFor={`${formId}-desc`}>Description <span className="optional">(optional)</span></label>
              <textarea
                id={`${formId}-desc`}
                placeholder="What does this artifact do?"
                value={description}
                maxLength={DESC_MAX}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                aria-describedby={errors.description ? `${formId}-desc-err` : `${formId}-desc-hint`}
                aria-invalid={!!errors.description}
              />
              <p id={`${formId}-desc-hint`} className="field-hint char-count">
                {description.length}/{DESC_MAX}
              </p>
              {errors.description && (
                <p id={`${formId}-desc-err`} className="field-error" role="alert">{errors.description}</p>
              )}
            </div>

            {/* Content */}
            <div className="field-group">
              <label htmlFor={`${formId}-content`}>Content <span aria-hidden="true">*</span></label>
              <textarea
                id={`${formId}-content`}
                className="content-editor"
                placeholder={`Paste your ${type} content here…`}
                value={content}
                maxLength={CONTENT_MAX}
                rows={14}
                onChange={(e) => setContent(e.target.value)}
                aria-describedby={errors.content ? `${formId}-content-err` : `${formId}-content-hint`}
                aria-invalid={!!errors.content}
                required
                spellCheck={false}
              />
              <p id={`${formId}-content-hint`} className="field-hint char-count">
                {content.length}/{CONTENT_MAX}
              </p>
              {errors.content && (
                <p id={`${formId}-content-err`} className="field-error" role="alert">{errors.content}</p>
              )}
            </div>

            {/* Tags */}
            <div className="field-group">
              <label>Tags <span className="optional">(optional)</span></label>
              <TagInput tags={tags} onChange={setTags} />
            </div>

            {errors.submit && (
              <p className="field-error submit-error" role="alert">{errors.submit}</p>
            )}

            <button type="submit" className="btn btn-primary" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Submitting…' : 'Preview & Submit'}
            </button>
          </form>
        </section>

        {/* ── PREVIEW PANEL ── */}
        {status === 'preview' && preview.length > 0 && (
          <aside className="preview-col" aria-label="Artifact preview">
            <div className="preview-header">
              <h2>Preview</h2>
              <div className="preview-tabs" role="tablist" aria-label="Export format">
                {preview.map((a, i) => (
                  <button
                    key={a.format}
                    role="tab"
                    aria-selected={activeArtifact === i}
                    className={`tab-btn${activeArtifact === i ? ' active' : ''}`}
                    onClick={() => setActiveArtifact(i)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>

            <pre className="preview-pane" aria-live="polite" tabIndex={0}>
              <code>{preview[activeArtifact]?.content}</code>
            </pre>

            <div className="preview-actions">
              <button className="btn btn-ghost" onClick={handleCopy} aria-live="polite">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => downloadArtifact(preview[activeArtifact])}
              >
                Download
              </button>
              <button
                className="btn btn-primary"
                disabled={status === 'submitting'}
                onClick={handleSubmit}
              >
                {status === 'submitting' ? 'Submitting…' : 'Confirm & Submit'}
              </button>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
