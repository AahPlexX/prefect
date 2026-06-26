/**
 * Prefect — Typed API client
 * All fetch calls go through here. Base URL is always relative (/api)
 * so Vite's dev proxy and Cloudflare Pages production routing both work
 * without environment-specific configuration.
 */
import type {
  Submission,
  SubmissionInput,
  SubmissionsListResponse,
  SubmissionResponse,
} from "@/types";

// ─── Error type ───────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options?: RequestInit & { signal?: AbortSignal }
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });
  } catch (networkError) {
    throw new ApiError("Network request failed. Check your connection.", 0);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("Server returned an unreadable response.", response.status);
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as Record<string, unknown>).error === "string"
        ? (body as { error: string }).error
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

// ─── Public API surface ───────────────────────────────────────────────────────

/** Submit a new artifact. No auth required — username is the only identity. */
export async function createSubmission(
  input: SubmissionInput,
  signal?: AbortSignal
): Promise<Submission> {
  const res = await request<SubmissionResponse>("/submissions", {
    method: "POST",
    body: JSON.stringify(input),
    signal,
  });
  return res.submission;
}

export interface ListParams {
  type?: string;
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

/** Fetch paginated list of submissions, optionally filtered by type. */
export async function listSubmissions(params: ListParams = {}): Promise<SubmissionsListResponse> {
  const { type, limit = 20, cursor, signal } = params;
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (limit !== 20) qs.set("limit", String(limit));
  if (cursor) qs.set("cursor", cursor);
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return request<SubmissionsListResponse>(`/submissions${query}`, { signal });
}

/** Fetch a single submission by its ID. */
export async function getSubmission(
  id: string,
  signal?: AbortSignal
): Promise<Submission> {
  const res = await request<SubmissionResponse>(`/submissions/${id}`, { signal });
  return res.submission;
}

/** Check Worker health. */
export async function healthCheck(signal?: AbortSignal): Promise<{ ok: boolean; ts: string }> {
  return request<{ ok: boolean; ts: string }>("/health", { signal });
}
