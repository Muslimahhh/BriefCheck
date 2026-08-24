"use client";

import { useMemo, useState } from "react";
import {
  exampleAnalysis,
  exampleConversation,
  isBuiltInExample
} from "@/lib/briefcheck/example";
import { validateAnalysis } from "@/lib/briefcheck/grounding";
import type {
  Analysis,
  Classification,
  Decision,
  Evidence,
  Finding,
  FindingState
} from "@/lib/briefcheck/types";

const classificationStyles: Record<Classification, string> = {
  "Needs challenge": "border-clay bg-[#fff7f4] text-clay",
  "Needs clarification": "border-maize bg-[#fffaf0] text-[#72551d]",
  Inferred: "border-steel bg-[#f1f5f7] text-steel",
  Preference: "border-[#8a6a3f] bg-[#fff8ec] text-[#72551d]",
  Supported: "border-moss bg-[#f1f7f2] text-moss"
};

const groups: Classification[] = [
  "Needs challenge",
  "Needs clarification",
  "Inferred",
  "Preference",
  "Supported"
];

function toFindingState(findings: Finding[]): FindingState[] {
  return findings.map((finding) => ({
    ...finding,
    autoRetained: isAutoRetained(finding),
    decision: getInitialDecision(finding),
    currentCriterion: finding.criterion
  }));
}

function getInitialDecision(finding: Finding): Decision {
  if (finding.classification === "Supported" && finding.confidence === "High") {
    return "Confirmed";
  }

  if (finding.classification === "Preference" && finding.confidence === "High") {
    return "Preference";
  }

  return "Needs review";
}

function isAutoRetained(finding: Finding) {
  return (
    (finding.classification === "Supported" ||
      finding.classification === "Preference") &&
    finding.confidence === "High"
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [submittedInput, setSubmittedInput] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [hasAnalysedSource, setHasAnalysedSource] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [showVerified, setShowVerified] = useState(false);
  const [evidenceItems, setEvidenceItems] = useState<Evidence[]>([]);
  const [findings, setFindings] = useState<FindingState[]>([]);

  const activeEvidenceIds = useMemo(() => {
    const selected = findings.find((finding) => finding.id === selectedId);
    return new Set(selected?.evidenceIds ?? []);
  }, [findings, selectedId]);

  const unresolvedIssueCount = findings.filter(
    (finding) => isBlockingFinding(finding)
  ).length;

  function updateFinding(id: string, decision: Decision, criterion?: string) {
    setFindings((current) =>
      current.map((finding) =>
        finding.id === id
          ? {
              ...finding,
              autoRetained: false,
              decision,
              currentCriterion: criterion ?? finding.currentCriterion
            }
          : finding
      )
    );
  }

  async function checkBrief() {
    const source = input.trim();

    if (!source) {
      setValidationMessage("Paste or load a hiring brief first.");
      resetAnalysis();
      return;
    }

    setSubmittedInput(source);
    setEvidenceItems([]);
    setFindings([]);
    setSelectedId("");
    setShowVerified(false);
    setValidationMessage("");
    setAnalysisError("");
    setIsChecking(true);

    try {
      const analysis = isBuiltInExample(source)
        ? validateAnalysis(source, exampleAnalysis)
        : await requestAnalysis(source);
      const nextFindings = toFindingState(analysis.findings);

      setEvidenceItems(analysis.evidence);
      setFindings(nextFindings);
      setHasChecked(true);
      setHasAnalysedSource(true);
    } catch {
      setAnalysisError("Analysis failed. Please try again.");
      setHasChecked(false);
      setEvidenceItems([]);
      setFindings([]);
    } finally {
      setIsChecking(false);
    }
  }

  function loadExample() {
    setInput(exampleConversation);
    setValidationMessage("");
    setAnalysisError("");
    resetAnalysis();
  }

  function handleInputChange(value: string) {
    setInput(value);
    setValidationMessage("");
    setAnalysisError("");
    resetAnalysis();
  }

  function clearSource() {
    setInput("");
    setValidationMessage("");
    setAnalysisError("");
    setHasAnalysedSource(false);
    resetAnalysis();
  }

  function resetAnalysis() {
    setSubmittedInput("");
    setEvidenceItems([]);
    setFindings([]);
    setSelectedId("");
    setShowVerified(false);
    setHasChecked(false);
    setIsChecking(false);
  }

  if (!hasChecked) {
    return (
      <main className="min-h-screen px-6 py-8 lg:px-10">
        <section className="mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex items-center justify-between border-b border-line pb-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-moss">
                BriefCheck
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-ink md:text-5xl">
                Before an agent acts on your hiring brief, check what
                it&apos;s assuming.
              </h1>
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-lg border border-line bg-white p-5 shadow-panel">
              <label
                htmlFor="brief-input"
                className="text-sm font-semibold text-ink"
              >
                Intake conversation or hiring brief
              </label>
              <textarea
                id="brief-input"
                value={input}
                onChange={(event) => handleInputChange(event.target.value)}
                placeholder="Paste the raw intake notes, Slack thread, or draft hiring brief..."
                className="mt-3 h-[420px] w-full resize-none rounded-md border border-line bg-[#fbfcfa] p-4 text-sm leading-6 text-ink"
              />
              {validationMessage ? (
                <p className="mt-2 text-sm font-medium text-clay">
                  {validationMessage}
                </p>
              ) : null}
              {analysisError ? (
                <p className="mt-2 text-sm font-medium text-clay">
                  {analysisError}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={checkBrief}
                  disabled={isChecking}
                  className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-[#111820] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {isChecking
                    ? "Checking the brief..."
                    : hasAnalysedSource
                      ? "Check again"
                      : "Check brief"}
                </button>
                <button
                  type="button"
                  onClick={loadExample}
                  disabled={isChecking}
                  className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-[#eef1ea] disabled:cursor-not-allowed disabled:opacity-65"
                >
                  Try an example
                </button>
                {hasAnalysedSource || input.trim() ? (
                  <button
                    type="button"
                    onClick={clearSource}
                    disabled={isChecking}
                    className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-[#eef1ea] disabled:cursor-not-allowed disabled:opacity-65"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              {isChecking ? (
                <p className="mt-3 text-sm text-[#5e6a72]">
                  Identifying criteria, checking evidence, and finding
                  assumptions.
                </p>
              ) : null}
            </section>

            <aside className="rounded-lg border border-line bg-[#eef1ea] p-5">
              <h2 className="text-lg font-semibold text-ink">
                What this checks
              </h2>
              <div className="mt-5 space-y-4 text-sm leading-6 text-[#44515c]">
                <p>
                  BriefCheck separates explicit statements from inferred
                  criteria, then asks a human to approve, rewrite, or remove
                  the assumptions before delegation.
                </p>
                <p>
                  The built-in example uses deterministic analysis. Custom
                  input is analysed server-side, then validated against the
                  submitted source before it reaches the interface.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white px-6 py-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-moss">
              BriefCheck
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-ink">
              {unresolvedIssueCount > 0
                ? "Not ready to delegate"
                : "Ready to delegate"}
            </h1>
            <p className="mt-1 text-sm text-[#5e6a72]">
              {unresolvedIssueCount > 0
                ? unresolvedIssueCount === 1
                  ? "1 issue requires attention"
                  : `${unresolvedIssueCount} issues require attention`
                : "All blocking findings resolved."}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetAnalysis}
              className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-[#eef1ea]"
            >
              Edit source
            </button>
            <button
              type="button"
              onClick={() => setShowVerified(true)}
              disabled={unresolvedIssueCount > 0}
              className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-[#111820] disabled:cursor-not-allowed disabled:opacity-65"
            >
              Generate verified brief
            </button>
          </div>
        </div>
        {unresolvedIssueCount > 0 ? (
          <p className="mt-3 text-sm text-[#5e6a72]">
            Resolve or remove the flagged findings before generating a verified
            brief.
          </p>
        ) : null}
      </header>

      <div className="grid min-h-[calc(100vh-89px)] lg:grid-cols-[0.94fr_1.06fr]">
        <section className="border-b border-line bg-white p-5 lg:border-b-0 lg:border-r lg:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#66737c]">
            Original source
          </h2>
          <div className="mt-4 space-y-3 rounded-lg border border-line bg-[#fbfcfa] p-4 text-sm leading-6">
            <Transcript
              activeEvidenceIds={activeEvidenceIds}
              evidenceItems={evidenceItems}
              sourceText={submittedInput}
            />
          </div>
        </section>

        <section className="p-5 lg:p-6">
          {!showVerified ? (
            <div className="space-y-6">
              {groups.map((group) => {
                const groupFindings = findings.filter(
                  (finding) => finding.classification === group
                );

                return (
                  <section key={group}>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#66737c]">
                        {group}
                      </h2>
                      <span className="text-xs text-[#66737c]">
                        {groupFindings.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {groupFindings.map((finding) => (
                        <FindingCard
                          key={finding.id}
                          finding={finding}
                          evidenceItems={evidenceItems.filter((item) =>
                            finding.evidenceIds.includes(item.id)
                          )}
                          selected={finding.id === selectedId}
                          onSelect={() =>
                            setSelectedId((current) =>
                              current === finding.id ? "" : finding.id
                            )
                          }
                          onConfirm={() => updateFinding(finding.id, "Confirmed")}
                          onRemove={() => updateFinding(finding.id, "Removed")}
                          onMustHave={() => updateFinding(finding.id, "Must-have")}
                          onPreference={() =>
                            updateFinding(finding.id, "Preference")
                          }
                          onRewrite={() =>
                            updateFinding(
                              finding.id,
                              "Rewritten",
                              finding.suggestedRewrite ?? finding.currentCriterion
                            )
                          }
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <VerifiedBrief evidenceItems={evidenceItems} findings={findings} />
          )}
        </section>
      </div>
    </main>
  );
}

async function requestAnalysis(source: string) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ source })
  });

  if (!response.ok) {
    throw new Error("Analysis request failed.");
  }

  const analysis = (await response.json()) as Analysis;
  return validateAnalysis(source, analysis);
}

function FindingCard({
  finding,
  evidenceItems,
  selected,
  onSelect,
  onConfirm,
  onRemove,
  onMustHave,
  onPreference,
  onRewrite
}: {
  finding: FindingState;
  evidenceItems: Evidence[];
  selected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  onRemove: () => void;
  onMustHave: () => void;
  onPreference: () => void;
  onRewrite: () => void;
}) {
  const isRemoved = finding.decision === "Removed";

  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-panel transition ${
        selected ? "border-ink bg-[#fbfcfa] ring-1 ring-ink/10" : "border-line"
      } ${isRemoved ? "opacity-55" : ""}`}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-ink">
              {finding.currentCriterion}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#4f5d67]">
              {finding.explanation}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${classificationStyles[finding.classification]}`}
          >
            {finding.classification}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {finding.confidence ? (
            <span className="rounded-full bg-[#eef1ea] px-3 py-1 text-[#4f5d67]">
              Confidence: {finding.confidence}
            </span>
          ) : null}
              <span className="rounded-full bg-[#eef1ea] px-3 py-1 text-[#4f5d67]">
                Decision: {finding.decision}
              </span>
              {finding.autoRetained && finding.decision !== "Removed" ? (
                <span className="rounded-full bg-[#f1f7f2] px-3 py-1 text-moss">
                  Auto-retained
                </span>
              ) : null}
          {finding.classification === "Inferred" ? (
            <span className="rounded-full bg-[#f1f5f7] px-3 py-1 text-steel">
              Inferred, not explicitly stated
            </span>
          ) : null}
        </div>
      </button>

      {selected ? (
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-3 space-y-2">
            {evidenceItems.map((item) => (
              <p
                key={item.id}
                data-testid="evidence-quote"
                className="rounded-md border border-line bg-[#fbfcfa] p-3 text-sm leading-6 text-ink"
              >
                <span className="font-semibold">Evidence: </span>
                &quot;{item.text}&quot;
              </p>
            ))}
          </div>
          {finding.suggestedQuestion ? (
            <p className="text-sm leading-6 text-ink">
              <span className="font-semibold">Suggested clarification: </span>
              {finding.suggestedQuestion}
            </p>
          ) : null}
          {finding.suggestedRewrite ? (
            <p className="mt-2 text-sm leading-6 text-ink">
              <span className="font-semibold">Suggested rewrite: </span>
              {finding.suggestedRewrite}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {finding.autoRetained && finding.classification === "Supported" ? (
              <>
                <ActionButton onClick={onMustHave}>
                  Keep as must-have
                </ActionButton>
                <ActionButton onClick={onPreference}>
                  Convert to preference
                </ActionButton>
              </>
            ) : null}
            {finding.autoRetained && finding.classification === "Preference" ? (
              <>
                <ActionButton onClick={onPreference}>
                  Keep as preference
                </ActionButton>
                <ActionButton onClick={onMustHave}>
                  Convert to must-have
                </ActionButton>
              </>
            ) : null}
            {!finding.autoRetained ? (
              <>
                <ActionButton onClick={onConfirm}>Confirm</ActionButton>
                <ActionButton onClick={onMustHave}>
                  Keep as must-have
                </ActionButton>
                <ActionButton onClick={onPreference}>
                  Convert to preference
                </ActionButton>
              </>
            ) : null}
            {finding.suggestedRewrite ? (
              <ActionButton onClick={onRewrite}>
                Replace with evidence
              </ActionButton>
            ) : null}
            <ActionButton onClick={onRemove}>Remove</ActionButton>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function isBlockingFinding(finding: FindingState) {
  if (finding.decision === "Removed") {
    return false;
  }

  if (
    finding.classification === "Inferred" ||
    finding.classification === "Needs clarification" ||
    finding.classification === "Needs challenge"
  ) {
    return finding.decision === "Needs review";
  }

  return false;
}

function Transcript({
  activeEvidenceIds,
  evidenceItems,
  sourceText
}: {
  activeEvidenceIds: Set<string>;
  evidenceItems: Evidence[];
  sourceText: string;
}) {
  return (
    <div data-testid="source-transcript">
      {sourceText.split(/\n{2,}/).map((paragraph, index) => (
        <article
          key={`${paragraph}-${index}`}
          className="rounded-md border border-transparent p-3"
        >
          <p className="whitespace-pre-wrap text-ink">
            {renderHighlightedEvidence(
              paragraph,
              activeEvidenceIds,
              evidenceItems
            )}
          </p>
        </article>
      ))}
    </div>
  );
}

function renderHighlightedEvidence(
  paragraph: string,
  activeEvidenceIds: Set<string>,
  evidenceItems: Evidence[]
) {
  const matches = evidenceItems
    .filter((item) => activeEvidenceIds.has(item.id))
    .map((item) => {
      const start = paragraph.toLowerCase().indexOf(item.text.toLowerCase());
      return start === -1
        ? null
        : {
            start,
            end: start + item.text.length
          };
    })
    .filter((match): match is { start: number; end: number } => Boolean(match))
    .sort((a, b) => a.start - b.start);

  if (matches.length === 0) {
    return paragraph;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    if (match.start < cursor) {
      return;
    }

    parts.push(paragraph.slice(cursor, match.start));
    parts.push(
      <mark
        key={`${match.start}-${index}`}
        className="rounded border border-maize bg-[#fff7dc] px-1 text-ink"
      >
        {paragraph.slice(match.start, match.end)}
      </mark>
    );
    cursor = match.end;
  });

  parts.push(paragraph.slice(cursor));
  return parts;
}

function ActionButton({
  children,
  onClick
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-line bg-[#fbfcfa] px-3 py-2 text-xs font-semibold text-ink hover:bg-[#eef1ea]"
    >
      {children}
    </button>
  );
}

function VerifiedBrief({
  evidenceItems,
  findings
}: {
  evidenceItems: Evidence[];
  findings: FindingState[];
}) {
  const retained = findings.filter((finding) => isRetained(finding));
  const constraints = retained.filter(isConstraintFinding);
  const outcomes = retained.filter(isOutcomeFinding);
  const constraintIds = new Set(constraints.map((finding) => finding.id));
  const outcomeIds = new Set(outcomes.map((finding) => finding.id));
  const mustHaves = retained.filter(
    (finding) =>
      !constraintIds.has(finding.id) &&
      !outcomeIds.has(finding.id) &&
      finding.decision !== "Preference"
  );
  const preferences = retained.filter(
    (finding) =>
      finding.decision === "Preference" && !constraintIds.has(finding.id)
  );
  const recordSections = buildInterpretationRecord(findings, evidenceItems);

  return (
    <div className="space-y-5">
      <section
        data-testid="verified-brief"
        className="rounded-lg border border-line bg-white p-5 shadow-panel"
      >
        <h2 className="text-xl font-semibold text-ink">Verified brief</h2>
        <BriefSection
          title="Must-haves"
          emptyText="Not established in source"
          items={mustHaves.map((finding) => finding.currentCriterion)}
        />
        <BriefSection
          title="Preferences"
          emptyText="Not established in source"
          items={preferences.map((finding) => finding.currentCriterion)}
        />
        <BriefSection
          title="Constraints"
          emptyText="Not established in source"
          items={constraints.map((finding) => finding.currentCriterion)}
        />
        <BriefSection
          title="Outcome"
          emptyText="Not established in source"
          items={outcomes.map((finding) => finding.currentCriterion)}
        />
      </section>

      <section
        data-testid="interpretation-record"
        className="rounded-lg border border-line bg-white p-5 shadow-panel"
      >
        <h2 className="text-xl font-semibold text-ink">
          Interpretation record
        </h2>
        {recordSections.length ? (
          recordSections.map((section) => (
            <BriefSection
              key={section.title}
              title={section.title}
              items={section.items}
            />
          ))
        ) : (
          <p className="mt-2 text-sm text-[#66737c]">
            No interpretation decisions recorded.
          </p>
        )}
      </section>
    </div>
  );
}

function buildInterpretationRecord(
  findings: FindingState[],
  evidenceItems: Evidence[]
) {
  const usedIds = new Set<string>();
  const sections: Array<{ title: string; items: string[] }> = [];

  function take(
    title: string,
    predicate: (finding: FindingState) => boolean
  ) {
    const items = findings
      .filter((finding) => !usedIds.has(finding.id) && predicate(finding))
      .map((finding) => {
        usedIds.add(finding.id);
        return describeFinding(finding, evidenceItems);
      });

    if (items.length) {
      sections.push({ title, items });
    }
  }

  take(
    "Automatically retained",
    (finding) =>
      finding.autoRetained &&
      finding.classification === "Supported" &&
      finding.decision !== "Removed" &&
      finding.decision !== "Preference"
  );
  take(
    "Preferences retained",
    (finding) => finding.decision === "Preference"
  );
  take(
    "Inferred criteria approved",
    (finding) =>
      finding.classification === "Inferred" &&
      finding.decision !== "Needs review" &&
      finding.decision !== "Removed"
  );
  take(
    "Human changes",
    (finding) =>
      !finding.autoRetained &&
      finding.decision !== "Needs review" &&
      finding.decision !== "Removed"
  );
  take(
    "Removed / not retained",
    (finding) => finding.decision === "Removed"
  );

  return sections;
}

function describeFinding(finding: FindingState, evidenceItems: Evidence[]) {
  const excerpts = evidenceItems
    .filter((item) => finding.evidenceIds.includes(item.id))
    .map((item) => `"${item.text}"`);
  const decision =
    finding.decision === "Needs review" ? "" : ` Decision: ${finding.decision}.`;
  const evidence = excerpts.length
    ? ` Evidence: ${excerpts.join(" ")}`
    : " Evidence: not established in source.";

  return `${finding.currentCriterion}.${decision}${evidence}`;
}

function isRetained(finding: FindingState) {
  return (
    finding.decision !== "Needs review" &&
    finding.decision !== "Removed"
  );
}

function isConstraintFinding(finding: FindingState) {
  return /\b(authorization|authorisation|work permit|right to work|london|location|remote|timezone|time zone|salary|compensation|constraint|visa|hybrid|office|days a week|on-call|on call|start date|start within)\b/i.test(
    `${finding.currentCriterion} ${finding.explanation}`
  );
}

function isOutcomeFinding(finding: FindingState) {
  return /\b(outcome|goal|objective|success measure|first six months)\b/i.test(
    `${finding.currentCriterion} ${finding.explanation}`
  );
}

function BriefSection({
  title,
  items,
  emptyText = "Not established in source"
}: {
  title: string;
  items: string[];
  emptyText?: string;
}) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#66737c]">
        {title}
      </h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm leading-6 text-ink">
          {items.map((item) => (
            <li key={item} className="border-l-2 border-line pl-3">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[#66737c]">{emptyText}</p>
      )}
    </div>
  );
}
