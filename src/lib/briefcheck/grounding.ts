import type {
  Analysis,
  Classification,
  Evidence,
  Finding,
  ModelAnalysis,
  ModelClassification
} from "./types";

const classificationMap: Record<ModelClassification, Classification> = {
  needs_challenge: "Needs challenge",
  needs_clarification: "Needs clarification",
  inferred: "Inferred",
  preference: "Preference",
  supported: "Supported"
};

const allowedClassifications = new Set(Object.keys(classificationMap));

export function isModelAnalysis(value: unknown): value is ModelAnalysis {
  if (!value || typeof value !== "object") {
    return false;
  }

  const findings = (value as ModelAnalysis).findings;
  return Array.isArray(findings) && findings.every(isModelFinding);
}

export function toGroundedAnalysis(source: string, modelAnalysis: ModelAnalysis) {
  const evidence: Evidence[] = [];
  const findings: Finding[] = [];

  modelAnalysis.findings.forEach((finding, findingIndex) => {
    const evidenceIds: string[] = [];

    finding.evidence.forEach((excerpt, evidenceIndex) => {
      const groundedExcerpt = findGroundedExcerpt(source, excerpt);

      if (!groundedExcerpt) {
        developmentWarn(
          `Rejected ungrounded evidence for "${finding.criterion}": "${excerpt}"`
        );
        return;
      }

      const id = `${safeId(finding.id || finding.criterion)}-${evidenceIndex}`;
      evidence.push({
        id,
        speaker: "Source",
        text: groundedExcerpt
      });
      evidenceIds.push(id);
    });

    if (evidenceIds.length === 0) {
      developmentWarn(
        `Rejected finding with no grounded evidence: "${finding.criterion}"`
      );
      return;
    }

    findings.push({
      id: safeId(finding.id || `${finding.criterion}-${findingIndex}`),
      criterion: finding.criterion,
      classification: classificationMap[finding.classification],
      evidenceIds,
      explanation: finding.explanation,
      confidence: titleCaseConfidence(finding.confidence),
      suggestedQuestion: finding.suggestedClarification ?? undefined
    });
  });

  return { evidence, findings };
}

export function validateAnalysis(source: string, analysis: Analysis): Analysis {
  const validEvidence = analysis.evidence.filter((item) => {
    const groundedExcerpt = findGroundedExcerpt(source, item.text);
    const isValid = Boolean(groundedExcerpt);

    if (!isValid) {
      developmentWarn(
        `Rejected ungrounded deterministic evidence: "${item.text}"`
      );
    }

    if (groundedExcerpt && groundedExcerpt !== item.text) {
      item.text = groundedExcerpt;
    }

    return isValid;
  });
  const validEvidenceIds = new Set(validEvidence.map((item) => item.id));
  const validFindings = analysis.findings
    .map((finding) => ({
      ...finding,
      evidenceIds: finding.evidenceIds.filter((id) => validEvidenceIds.has(id))
    }))
    .filter((finding) => {
      const isValid = finding.evidenceIds.length > 0;

      if (!isValid) {
        developmentWarn(
          `Rejected finding with no grounded evidence: "${finding.criterion}"`
        );
      }

      return isValid;
    });

  return {
    evidence: validEvidence,
    findings: validFindings
  };
}

export function findGroundedExcerpt(source: string, excerpt: string) {
  if (!excerpt.trim()) {
    return null;
  }

  if (source.includes(excerpt)) {
    return excerpt;
  }

  const tokens = excerpt.trim().split(/\s+/).map(escapeRegExp);
  const pattern = new RegExp(tokens.join("\\s+"));
  const match = source.match(pattern);

  return match?.[0] ?? null;
}

function isModelFinding(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const finding = value as Record<string, unknown>;
  const classification = String(finding.classification);
  const inferred = finding.inferred;

  return (
    typeof finding.id === "string" &&
    typeof finding.criterion === "string" &&
    typeof finding.classification === "string" &&
    allowedClassifications.has(classification) &&
    typeof finding.explanation === "string" &&
    Array.isArray(finding.evidence) &&
    finding.evidence.every((item) => typeof item === "string") &&
    ["high", "medium", "low"].includes(String(finding.confidence)) &&
    (typeof finding.suggestedClarification === "string" ||
      finding.suggestedClarification === null) &&
    typeof inferred === "boolean" &&
    (classification === "inferred") === inferred &&
    finding.decision === "needs_review"
  );
}

function titleCaseConfidence(confidence: "high" | "medium" | "low") {
  if (confidence === "high") {
    return "High";
  }
  if (confidence === "medium") {
    return "Medium";
  }
  return "Low";
}

function safeId(value: string) {
  const id = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return id || "finding";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function developmentWarn(message: string) {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`BriefCheck evidence grounding: ${message}`);
  }
}
