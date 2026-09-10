import type { Tier, Tone } from "./tokens";

/** Contrats de données des composants (react-mapping/types.ts de la Tranche 3, complétés). */
export type AccessState = "granted" | "pending" | "denied" | "regulatory";
export type Confidence = "LOW" | "MEDIUM" | "HIGH";
export type AnswerConfidence = "HIGH" | "MEDIUM" | "INSUFFICIENT";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueStatus = "open" | "investigating" | "mitigated" | "closed";
export type DocumentState = "view" | "download" | "blocked" | "superseded" | "revoked";

export interface PermissionLensModel {
  tier: Tier | "VDR" | "CleanTeam";
  state: AccessState;
  reason: string;
  missing?: string[];
  nextAction?: { label: string; href?: string; controlId: string };
}

export interface Evidence {
  fact?: string;
  source: string;
  quality: "declared" | "documented" | "reviewed";
  confidence: Confidence;
  reviewedAt: string;
}

export interface RailStage {
  id: string;
  label: string;
}

export interface Risk {
  id: string;
  title: string;
  severity: Severity;
  category: "risk" | "compliance" | "financial";
  impact: string[];
  status: IssueStatus;
  evidenceIds: string[];
}

export interface DealLensCitation {
  documentId: string;
  documentTitle?: string;
  page: number;
  anchor?: string;
  href?: string;
}

export interface DealLensAnswerModel {
  scope: "document" | "room";
  answer: string;
  confidence: AnswerConfidence;
  citations: DealLensCitation[];
  potentialIssues?: string[];
  openQuestions?: string[];
}

export interface DocumentModel {
  id: string;
  title: string;
  folder: string;
  version: number;
  updatedAt: string;
  state: DocumentState;
  cleanTeam?: boolean;
}

export interface QnaThreadModel {
  id: string;
  question: string;
  category: string;
  author: string;
  askedAt: string;
  status: "OPEN" | "ANSWERED" | "CLOSED";
  documentTitle?: string;
  answer?: { text: string; by: string; at: string };
}

export interface CriteriaRow {
  label: string;
  state: "missing" | "declared" | "reviewed" | "certified" | "ok" | "ko";
  detail?: string;
}

export type { Tier, Tone };
