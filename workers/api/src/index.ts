/**
 * Prefect API — Cloudflare Worker
 * Framework: Hono
 * Storage:   Cloudflare KV (SUBMISSIONS binding)
 * Auth:      None — username-only submissions
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { HTTPException } from "hono/http-exception";

export type ArtifactType = ".skills" | ".agents" | ".prompts" | ".chains" | ".tools" | ".personas";

export interface Submission {
  id: string;
  username: string;
  type: ArtifactType;
  title: string;
  description: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO 8601
  slug: string; // username-title-nanoid
}

export interface SubmissionInput {
  username: string;
  type: ArtifactType;
  title: string;
  description: string;
  content: string;
  tags?: string[];
}

type Bindings = {
  SUBMISSIONS: KVNamespace;
  ALLOWED_ORIGIN: string;
};

const ARTIFACT_TYPES: ArtifactType[] = [
  ".skills",
  ".agents",
  ".prompts",
  ".chains",
  ".tools",
  ".personas",
];

/** Deterministic nanoid-lite: 10 alphanumeric chars, no external deps */
function nanoid(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

function validateInput(body: unknown): SubmissionInput {
  if (typeof body !== "object" || body === null) throw new HTTPException(400, { message: "Body must be a JSON object" });
  const b = body as Record<string, unknown>;

  const username = (b.username ?? "").toString().trim();
  if (!username || username.length < 2 || username.length > 32)
    throw new HTTPException(400, { message: "username must be 2–32 characters" });
  if (!/^[a-zA-Z0-9_-]+$/.test(username))
    throw new HTTPException(400, { message: "username may only contain letters, numbers, underscores, and hyphens" });

  const type = b.type as ArtifactType;
  if (!ARTIFACT_TYPES.includes(type))
    throw new HTTPException(400, { message: `type must be one of: ${ARTIFACT_TYPES.join(", ")}` });

  const title = (b.title ?? "").toString().trim();
  if (!title || title.length < 3 || title.length > 80)
    throw new HTTPException(400, { message: "title must be 3–80 characters" });

  const description = (b.description ?? "").toString().trim();
  if (!description || description.length < 10 || description.length > 500)
    throw new HTTPException(400, { message: "description must be 10–500 characters" });

  const content = (b.content ?? "").toString().trim();
  if (!content || content.length < 1 || content.length > 32_000)
    throw new HTTPException(400, { message: "content must be 1–32,000 characters" });

  const tags: string[] = Array.isArray(b.tags)
    ? b.tags.slice(0, 8).map((t) => t.toString().trim().toLowerCase()).filter(Boolean)
    : [];

  return { username, type, title, description, content, tags };
}

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      const allowed = c.env.ALLOWED_ORIGIN;
      // Allow same-origin and configured Pages domain; also allow localhost for dev
      if (!origin || origin === allowed || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return origin ?? "*";
      }
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  })
);
app.use("/api/*", prettyJSON());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true, ts: new Date().toISOString() }));

// ─── POST /api/submissions ────────────────────────────────────────────────
app.post("/api/submissions", async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = validateInput(body);

  const id = nanoid();
  const slug = `${toSlug(input.username)}-${toSlug(input.title)}-${id}`;
  const now = new Date().toISOString();

  const submission: Submission = { id, slug, createdAt: now, ...input };

  // Index by id for fast single-item GET
  await c.env.SUBMISSIONS.put(`id:${id}`, JSON.stringify(submission), {
    metadata: { type: input.type, username: input.username, title: input.title, createdAt: now, slug },
  });

  // Index by type for filtered list GETs
  await c.env.SUBMISSIONS.put(`type:${input.type}:${id}`, id, {
    metadata: { type: input.type, username: input.username, title: input.title, createdAt: now, slug },
  });

  return c.json({ ok: true, submission }, 201);
});

// ─── GET /api/submissions ──────────────────────────────────────────────────
app.get("/api/submissions", async (c) => {
  const type = c.req.query("type") as ArtifactType | undefined;
  const cursor = c.req.query("cursor") ?? undefined;
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);

  const prefix = type && ARTIFACT_TYPES.includes(type) ? `type:${type}:` : "id:";

  const listed = await c.env.SUBMISSIONS.list({
    prefix,
    limit,
    cursor,
  });

  // When listing by type keys, the value is just the id — resolve to full objects
  const items: Submission[] = [];
  for (const key of listed.keys) {
    if (prefix === "id:") {
      const raw = await c.env.SUBMISSIONS.get(key.name);
      if (raw) items.push(JSON.parse(raw) as Submission);
    } else {
      const idVal = await c.env.SUBMISSIONS.get(key.name);
      if (idVal) {
        const raw = await c.env.SUBMISSIONS.get(`id:${idVal}`);
        if (raw) items.push(JSON.parse(raw) as Submission);
      }
    }
  }

  // Sort newest-first
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return c.json({
    ok: true,
    items,
    cursor: listed.list_complete ? null : listed.cursor,
    total: items.length,
  });
});

// ─── GET /api/submissions/:id ──────────────────────────────────────────────
app.get("/api/submissions/:id", async (c) => {
  const id = c.req.param("id");
  const raw = await c.env.SUBMISSIONS.get(`id:${id}`);
  if (!raw) throw new HTTPException(404, { message: "Submission not found" });
  return c.json({ ok: true, submission: JSON.parse(raw) as Submission });
});

// ─── Global error handler ─────────────────────────────────────────────────
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ ok: false, error: err.message }, err.status);
  }
  console.error(err);
  return c.json({ ok: false, error: "Internal server error" }, 500);
});

app.notFound((c) => c.json({ ok: false, error: "Route not found" }, 404));

export default app;
