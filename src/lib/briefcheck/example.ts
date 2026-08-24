import type { Analysis, Evidence, Finding } from "./types";

export const exampleConversation = `Recruiter: Before we send this to sourcing, can you walk me through the role?

HM: We need someone fairly senior, but I'm not obsessed with years of experience. They need to have actually shipped AI products.

Recruiter: Any particular background?

HM: Startup would be ideal. They'll need to be comfortable figuring things out without loads of structure.

Recruiter: Technical?

HM: Definitely. They don't need to be a hardcore backend engineer, but I don't want someone who just hands requirements to engineering either. They should be able to get into the product and build.

Recruiter: Anything else?

HM: Good product instincts. And I'd rather have someone who's built something people actually use than someone from a massive company with the perfect title.`;

export const exampleEvidence: Evidence[] = [
  {
    id: "ai-products",
    speaker: "HM",
    text: "They need to have actually shipped AI products."
  },
  {
    id: "limited-structure",
    speaker: "HM",
    text: "They'll need to be comfortable figuring things out without loads of structure."
  },
  {
    id: "startup",
    speaker: "HM",
    text: "Startup would be ideal."
  },
  {
    id: "instincts",
    speaker: "HM",
    text: "Good product instincts."
  },
  {
    id: "large-company-negative",
    speaker: "HM",
    text: "I'd rather have someone who's built something people actually use than someone from a massive company with the perfect title."
  }
];

export const exampleFindings: Finding[] = [
  {
    id: "ai-products",
    criterion: "Has shipped AI products",
    classification: "Supported",
    evidenceIds: ["ai-products"],
    explanation:
      "The hiring manager explicitly stated this requirement as a concrete evidence point.",
    confidence: "High"
  },
  {
    id: "startup",
    criterion: "Startup experience",
    classification: "Preference",
    evidenceIds: ["startup"],
    explanation:
      "The hiring manager described startup background as ideal rather than required.",
    confidence: "High"
  },
  {
    id: "limited-structure",
    criterion: "Comfortable operating with limited structure",
    classification: "Inferred",
    evidenceIds: ["limited-structure", "startup"],
    explanation:
      "This was inferred from the hiring manager's reason for preferring startup experience.",
    confidence: "Medium",
    suggestedQuestion:
      "Should comfort with limited structure be evaluated directly instead of using startup background as a proxy?"
  },
  {
    id: "product-instincts",
    criterion: "Strong product instincts",
    classification: "Needs clarification",
    evidenceIds: ["instincts"],
    explanation:
      "The phrase is important, but the brief does not define observable evidence for it.",
    confidence: "High",
    suggestedQuestion:
      "What would you expect this person to have done that demonstrates strong product judgment?",
    suggestedRewrite:
      "Has made product decisions that show strong judgment, supported by examples of customer use, trade-offs, or measurable adoption."
  },
  {
    id: "large-company-negative",
    criterion: "Large-company background as a negative signal",
    classification: "Needs challenge",
    evidenceIds: ["large-company-negative"],
    explanation:
      "The underlying requirement appears to be hands-on ownership and evidence of shipping, not company size itself.",
    confidence: "High",
    suggestedQuestion:
      "Do you want to screen for hands-on shipping evidence rather than company size?",
    suggestedRewrite:
      "Has built and shipped a product that reached real users, with clear evidence of hands-on ownership."
  }
];

export const exampleAnalysis: Analysis = {
  evidence: exampleEvidence,
  findings: exampleFindings
};

export function isBuiltInExample(source: string) {
  return normalizeText(source) === normalizeText(exampleConversation);
}

export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
