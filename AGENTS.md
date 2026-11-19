<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## MI-007 Locked Specification & Non-Override Guardrail

**MANDATORY:** Before modifying any chart, SMC, Volume Profile, Fibonacci, MI-007, Alerts, or Fundamentals code, read `docs/MI007_LOCKED_SPECIFICATION.md`.

- **DO NOT** override, remove, or regress any locked feature, UI toggle contract, tech stack choice, or mathematical invariant listed in `docs/MI007_LOCKED_SPECIFICATION.md` without explicit owner approval.
- **ALWAYS** run `npm run test:mi007` and ensure all 11 unconditional regression tests pass before committing to `main`.
