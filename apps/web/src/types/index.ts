/**
 * Prefect — Shared frontend types
 * Single source of truth: must stay in sync with workers/api/src/index.ts
 */

export const ARTIFACT_TYPES = [
  ".skills",
  ".agents",
  ".prompts",
  ".chains",
  ".tools",
  ".personas",
] as const;

export type ArtifactType = (typeof ARTIFACT_TYPES)[number];

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  ".skills": "Skill",
  ".agents": "Agent",
  ".prompts": "Prompt",
  ".chains": "Chain",
  ".tools": "Tool",
  ".personas": "Persona",
};

export interface Submission {
  id: string;
  username: string;
  type: ArtifactType;
  title: string;
  description: string;
  content: string;
  tags: string[];
  createdAt: string; // ISO 8601
  slug: string;
}

export interface SubmissionInput {
  username: string;
  type: ArtifactType;
  title: string;
  description: string;
  content: string;
  tags?: string[];
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface SubmissionsListResponse {
  ok: boolean;
  items: Submission[];
  cursor: string | null;
  total: number;
}

export interface SubmissionResponse {
  ok: boolean;
  submission: Submission;
}

/** Generation output returned by every generator function */
export interface GeneratedArtifact {
  filename: string;
  content: string;
  mimeType: string;
}
