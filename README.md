# ScamShield

Upload. Analyze. Understand. Verify.

ScamShield checks a screenshot or pasted message for common scam warning
signs and explains what it found.

## Pipeline

```
OpenAI sees -> JEV decides -> OpenAI explains
```

1. **OpenAI (sees):** reads an uploaded screenshot and extracts the message text.
2. **JEV (decides):** runs the structured risk questions and produces a risk score.
3. **OpenAI (explains):** turns JEV's result into plain-language warning signs and next steps.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The app runs without any API keys — `lib/openai.ts` and `lib/jev.ts` fall
back to a local mock and a keyword heuristic respectively, so the full
upload -> result flow is demoable immediately. Add `OPENAI_API_KEY` to
`.env.local` to enable real image reading and explanations.

## JEV integration

`src/lib/jev.ts` currently ships with a placeholder keyword heuristic
standing in for JEV, so the whole pipeline works end to end out of the box.
The real integration point is `analyzeMessage()` in that file: set
`JEV_API_URL` (and `JEV_API_KEY` if needed) in `.env.local` and it will
call that endpoint directly instead, expecting a JSON response shaped like
`JevResult` in `src/types/analysis.ts`. Nothing else in the app needs to
change.

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Home — upload/paste + analyze
│   ├── result/page.tsx       # Result screen
│   ├── about/page.tsx        # About / limitations / privacy
│   └── api/analyze/route.ts  # Full pipeline endpoint
├── components/                # UI building blocks
├── lib/
│   ├── openai.ts              # OpenAI extraction + explanation
│   ├── jev.ts                 # JEV decision engine (pluggable)
│   ├── concern-level.ts       # Risk score -> concern level
│   └── validation.ts          # Input validation + cleaning
└── types/analysis.ts          # Shared types across the pipeline
```

## Status

This is the foundation: project setup, the full UI flow, and a working
(mocked) end-to-end pipeline. Not yet wired up: real JEV integration,
rate limiting, and the 30-message test suite described in the project
spec.
