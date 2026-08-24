# BriefCheck

**A human review layer between a messy hiring brief and an AI recruiting agent.**

BriefCheck is a product experiment exploring a simple question:

> **Before an AI recruiting system acts on a hiring brief, how do we make sure it is acting on what the hiring manager actually meant?**

Hiring conversations are full of statements like "we need someone senior", "startup experience would be useful", or "I don't want someone too corporate."

Those statements are not equally safe or useful as recruiting criteria. Some are genuine requirements. Some are preferences. Some are vague. Some are proxies for something more meaningful.

BriefCheck makes that interpretation visible before the brief is delegated.

## What it does

Paste a hiring brief or recruiter intake conversation and BriefCheck analyses the criteria into:

* **Supported**: grounded and concrete enough to act on
* **Preference**: desirable, but not required
* **Inferred**: a reasonable interpretation that was not directly stated
* **Needs clarification**: meaningful, but too vague to evaluate consistently
* **Needs challenge**: potentially based on an unsupported proxy or assumption

Every finding is tied back to evidence in the original source.

Selecting a finding highlights the exact language behind it, and anything that requires human judgment must be resolved before the brief becomes **Ready to delegate**.

BriefCheck then produces a concise verified brief alongside an interpretation record of how the original source became that brief.

## The product decision behind it

One distinction became particularly important while building BriefCheck:

**Explicit does not necessarily mean actionable.**

If a hiring manager says:

> "We need someone very senior."

the requirement is explicit, but a recruiter still cannot consistently evaluate it without knowing what "very senior" means in that particular role.

Likewise:

> "Startup experience would probably help because we're tiny and people need to figure things out."

should not quietly become:

> "Must have startup experience."

The meaningful requirement may instead be the ability to work effectively with ambiguity and limited process.

BriefCheck is designed to preserve those distinctions rather than letting model interpretation silently become hiring criteria.

## Built to be sceptical of its own AI

During testing, an early version produced a criterion about shipping AI products even though the submitted brief never mentioned AI.

The problem was simple but important: example data had leaked into custom analysis.

That bug reinforced a principle I wanted the product itself to follow:

> **The model's output should not automatically become the source of truth.**

BriefCheck validates model-generated findings against the original source before displaying them. Evidence that cannot be grounded in the submitted text is rejected rather than presented as fact.

## Deliberately narrow

BriefCheck is not an ATS and does not attempt to handle the rest of the recruiting workflow.

I deliberately left out candidate ranking, CV parsing, sourcing, outreach, dashboards and integrations.

The MVP focuses on one moment:

**the point where human intent becomes instructions for someone, or something, else to act on.**

## Testing

I tested the system against deliberately different briefs, including vague requirements, hard logistical constraints, prestige proxies, contradictory leadership expectations, preferences that could be mistaken for requirements, messy recruiter conversations, and sparse input.

I also tested the opposite case.

BriefCheck should not manufacture problems simply because it is designed to inspect briefs. A clear brief containing genuinely operational requirements should be able to move directly to **Ready to delegate**.

## How it works

At a high level:

`Source -> AI analysis -> validation -> evidence grounding -> human review -> verified brief`

Built with **Next.js, TypeScript and Gemini**.

AI was also part of my development workflow. I used it for implementation, product reasoning, adversarial testing and debugging, while keeping the product decisions, scope and acceptance criteria human-led.

## What I'd test next

The next step would not be more features. It would be testing the product with recruiters and hiring managers.

I'd want to understand whether the challenges are useful, which interpretations users actually correct, whether evidence highlighting improves trust, and whether this review step can remain lightweight enough to preserve the efficiency promised by recruiting automation.

## Status

Experimental MVP built as a product exploration of human oversight in agentic recruiting.

---

## Technical footer

Built with:

* **Next.js**
* **TypeScript**
* **React**
* **Tailwind CSS**
* **Gemini Developer API**

The built-in example runs on deterministic mock data. Custom briefs are analysed through a modular Gemini provider, then passed through schema validation and source-evidence grounding before anything is rendered.

Local configuration uses:

* `GEMINI_API_KEY`
* `GEMINI_MODEL`

There is no authentication, database persistence, ATS integration, candidate ranking, CV parsing, sourcing, email, analytics or billing in this MVP.
