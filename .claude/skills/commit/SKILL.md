---
name: commit
description: Verify the working tree (lint, typecheck, tests) and create a well-formed git commit for this repo, pushing when asked. Use when the user wants to commit, save, or push their changes.
---

# Commit workflow for next-prisma-crud

Follow these steps in order. Stop and report instead of committing if any check fails.

## 1. Review what's changing

- `git status` and `git diff` — know exactly what will be committed.
- If unrelated changes are mixed together, propose splitting into separate logical commits (this repo's history favors single-purpose commits).
- Never commit `.env`, secrets, or generated artifacts (`.next/`, `tsconfig.tsbuildinfo` is gitignored — leave it that way).

## 2. Verify before committing (all three must pass)

```bash
npm run lint        # ESLint — must be clean
npx tsc --noEmit    # typecheck — must be clean
npm test            # full Vitest suite — needs Docker running (Testcontainers)
```

If Docker isn't running, start it first; don't skip the tests.
If the schema changed, confirm a migration exists for it (`npx prisma migrate status`).

## 3. Commit message conventions

Match the existing history (see `git log --oneline`): conventional-commit prefixes, imperative mood, concise subject:

- `feat:` new capability (e.g. `feat: add Category model and relation to Product`)
- `fix:` bug fix
- `refactor:` restructuring without behavior change
- `test:` test-only changes
- `docs:` / `chore:` documentation or maintenance

Subject line ≤ 72 chars. Add a short body only when the *why* isn't obvious from the diff.

Do **not** add `Co-Authored-By` trailers (or any other trailer) to commit messages — Omar wants clean messages with no attribution lines.

## 4. Commit and push

- Commit directly on `main` (this is a solo learning repo; that is its convention).
- Push only when the user asked for it: `git push origin main`.
- After pushing, report the commit hash and summarize what went up.
