export type Classification =
  | "Needs challenge"
  | "Needs clarification"
  | "Inferred"
  | "Preference"
  | "Supported";

export type Decision =
  | "Needs review"
  | "Confirmed"
  | "Removed"
  | "Must-have"
  | "Preference"
  | "Rewritten";

export type Evidence = {
  id: string;
  speaker: string;
  text: string;
};

export type Finding = {
  id: string;
  criterion: string;
  classification: Classification;
  evidenceIds: string[];
  explanation: string;
  confidence?: "High" | "Medium" | "Low";
  suggestedQuestion?: string;
  suggestedRewrite?: string;
};

export type FindingState = Finding & {
  autoRetained: boolean;
  decision: Decision;
  currentCriterion: string;
};

export type Analysis = {
  evidence: Evidence[];
  findings: Finding[];
};

export type ModelClassification =
  | "needs_challenge"
  | "needs_clarification"
  | "inferred"
  | "preference"
  | "supported";

export type ModelFinding = {
  id: string;
  criterion: string;
  classification: ModelClassification;
  explanation: string;
  evidence: string[];
  confidence: "high" | "medium" | "low";
  suggestedClarification: string | null;
  inferred: boolean;
  decision: "needs_review";
};

export type ModelAnalysis = {
  findings: ModelFinding[];
};
