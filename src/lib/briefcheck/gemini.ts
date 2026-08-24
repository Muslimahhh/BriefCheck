import type { ModelAnalysis } from "./types";

const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const FALLBACK_GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];
const GEMINI_REQUEST_TIMEOUT_MS = 25000;

const analysisSchema = {
  type: "object",
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        required: [
          "id",
          "criterion",
          "classification",
          "explanation",
          "evidence",
          "confidence",
          "suggestedClarification",
          "inferred",
          "decision"
        ],
        properties: {
          id: { type: "string" },
          criterion: { type: "string" },
          classification: {
            type: "string",
            enum: [
              "needs_challenge",
              "needs_clarification",
              "inferred",
              "preference",
              "supported"
            ]
          },
          explanation: { type: "string" },
          evidence: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" }
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"]
          },
          suggestedClarification: {
            type: "string"
          },
          inferred: { type: "boolean" },
          decision: {
            type: "string",
            enum: ["needs_review"]
          }
        }
      }
    }
  }
} as const;

export async function analyzeBriefWithGemini(source: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const configuredModel = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const models = [
    configuredModel,
    ...FALLBACK_GEMINI_MODELS.filter((model) => model !== configuredModel)
  ];
  let response: Response | null = null;
  let lastStatus = 0;

  for (const model of models) {
    response = await requestGeminiAnalysis(model, apiKey, source).catch(
      (error) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `BriefCheck Gemini provider: ${model} request failed; trying fallback model.`,
            error instanceof Error ? error.message : error
          );
        }

        return null;
      }
    );

    if (!response) {
      continue;
    }

    lastStatus = response.status;

    if (response.ok) {
      break;
    }

    if (!isRetryableStatus(response.status)) {
      break;
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `BriefCheck Gemini provider: ${model} returned ${response.status}; trying fallback model.`
      );
    }
  }

  if (!response?.ok) {
    throw new Error(`Gemini analysis request failed with ${lastStatus}.`);
  }

  const payload = await response.json();
  const outputText = extractOutputText(payload);

  if (!outputText) {
    throw new Error("Gemini analysis response did not include structured text.");
  }

  return JSON.parse(outputText) as ModelAnalysis;
}

function requestGeminiAnalysis(model: string, apiKey: string, source: string) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GEMINI_REQUEST_TIMEOUT_MS
  );

  return fetch(`${GEMINI_API_BASE_URL}/models/${model}:generateContent`, {
    method: "POST",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Source text to inspect:\n\n${source}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0
      }
    })
  }).finally(() => clearTimeout(timeout));
}

function isRetryableStatus(status: number) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function extractOutputText(payload: unknown) {
  const candidates = (payload as { candidates?: unknown })?.candidates;
  if (!Array.isArray(candidates)) {
    return "";
  }

  return candidates
    .flatMap((candidate) => {
      const parts = (candidate as { content?: { parts?: unknown } }).content
        ?.parts;
      return Array.isArray(parts) ? parts : [];
    })
    .map((part) =>
      typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : ""
    )
    .join("");
}

const systemPrompt = `You are BriefCheck, a hiring-brief analysis tool.

Your job is not to rewrite the hiring brief and not to invent ideal hiring criteria. Inspect only what the hiring manager actually communicated.

Return structured findings about assumptions, ambiguities, preferences, inferences, and source-supported criteria.

Classifications:
- supported: A meaningful criterion is directly supported by the source and sufficiently concrete, operational, or measurable for a recruiter or downstream recruiting agent to evaluate consistently.
- preference: Something is explicitly described as desirable, ideal, preferred, or nice-to-have rather than genuinely required.
- inferred: A meaningful criterion can reasonably be inferred from what was said, but was not explicitly stated as a criterion.
- needs_clarification: Something important has been expressed, but it is too ambiguous or subjective to evaluate consistently.
- needs_challenge: A criterion appears to rely on a potentially unsupported proxy or assumption rather than directly job-relevant evidence.

Supported is not the same thing as explicitly stated. A criterion may be supported only when it is both grounded in the source and operational enough to evaluate. Explicit but subjective criteria should normally be needs_clarification unless the source itself defines observable evidence for them.

Classification examples:
- "We need someone very senior." => needs_clarification because seniority is not operationally defined.
- "We need a Staff-level engineer who has led architecture for a production distributed system." => supported because the expected seniority is expressed through concrete evidence.
- "We need someone hands-on." => needs_clarification unless the source defines observable hands-on evidence.
- "We need someone who personally shipped at least one customer-facing AI feature into production." => supported.
- "We need someone with strong product instincts." => needs_clarification unless the source defines what observable evidence demonstrates this.
- Logistical constraints such as UK work authorization, London office three days per week, participation in an on-call rotation, or starting within eight weeks may be supported when explicitly stated.

Evidence rules:
- Every evidence excerpt must be copied exactly from the submitted source text.
- For inferred findings, the interpretation may be inferred, but every evidence excerpt must still be copied from the source.
- If there is insufficient evidence for a finding, omit the finding.
- Do not fabricate quotes.
- Do not mention criteria that are not grounded in the submitted source.

Accuracy rules:
- Do not manufacture problems. A clear, well-written brief may produce mostly supported findings.
- Do not classify subjective phrases as supported merely because they appear in the source. Judge whether the source gives enough observable meaning to make the criterion operational.
- Do not automatically reject years of experience, company background, or specific domain requirements. Explain why clarification or challenge is warranted only when the source does not connect the proxy to job-relevant evidence.
- Suggested clarification should be null unless the finding needs clarification, needs challenge, or would benefit from human approval.`;
