import { NextResponse } from "next/server";
import { analyzeBriefWithGemini } from "@/lib/briefcheck/gemini";
import {
  isModelAnalysis,
  toGroundedAnalysis,
  validateAnalysis
} from "@/lib/briefcheck/grounding";
import type { Analysis } from "@/lib/briefcheck/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const source =
      typeof body?.source === "string" ? body.source.trim() : "";

    if (!source) {
      return NextResponse.json(
        { error: "Source text is required." },
        { status: 400 }
      );
    }

    const modelAnalysis = await analyzeBriefWithGemini(source);

    if (!isModelAnalysis(modelAnalysis)) {
      return NextResponse.json(
        { error: "Model returned invalid structured analysis." },
        { status: 502 }
      );
    }

    const groundedAnalysis = validateAnalysis(
      source,
      applyProductSafeguards(toGroundedAnalysis(source, modelAnalysis))
    );

    return NextResponse.json(groundedAnalysis);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "BriefCheck analysis failed:",
        error instanceof Error ? error.message : error
      );
    }

    return NextResponse.json(
      { error: "Analysis failed. Please try again." },
      { status: 500 }
    );
  }
}

function applyProductSafeguards(analysis: Analysis): Analysis {
  return {
    ...analysis,
    findings: analysis.findings.map((finding) => {
      const criterionAndExplanation =
        `${finding.criterion} ${finding.explanation}`.toLowerCase();
      const joined = `${criterionAndExplanation} ${finding.evidenceIds
        .map((id) => analysis.evidence.find((item) => item.id === id)?.text ?? "")
        .join(" ")}`.toLowerCase();

      if (joined.includes("hands-on ownership") && joined.includes("job title")) {
        return {
          ...finding,
          classification: "Needs clarification",
          explanation:
            "The brief prioritizes hands-on ownership over job title, but does not define what observable ownership should look like.",
          suggestedQuestion:
            "What evidence of hands-on ownership should a recruiter or agent look for?"
        };
      }

      if (criterionAndExplanation.includes("corporate")) {
        return {
          ...finding,
          classification: "Needs challenge",
          explanation:
            "Corporate background is being used as a proxy. The source points toward a working-style concern, so this should be resolved before becoming a filter.",
          suggestedQuestion:
            "What specific working behaviors are you trying to avoid when you say corporate?"
        };
      }

      if (
        finding.classification === "Preference" &&
        /\b(would probably help|would be useful|would be nice|not required|preferred|preference|ideal)\b/i.test(
          joined
        )
      ) {
        return {
          ...finding,
          confidence: "High"
        };
      }

      return finding;
    })
  };
}
