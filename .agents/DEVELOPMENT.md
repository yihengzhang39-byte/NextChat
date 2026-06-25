# Development Guidelines

## Project Context

This repository is used for secondary development based on NextChat. The main
goal is to keep our custom changes easy to understand, review, and merge with
future upstream updates.

## Branching

- Use `main` only for stable integrated work.
- Create feature branches for non-trivial changes.
- Recommended branch names:
  - `feature/<short-name>`
  - `fix/<short-name>`
  - `chore/<short-name>`

## Commit Style

Use clear, scoped commit messages.

Recommended format:

```text
type(scope): short summary
```

Examples:

```text
docs(agent): add development handoff records
fix(chat): handle empty model response
feature(auth): add enterprise login entry
```

Common types:

- `feature`: user-facing feature
- `fix`: bug fix
- `docs`: documentation
- `chore`: maintenance
- `refactor`: behavior-preserving code restructure
- `test`: tests only

## Code Style

- Follow the existing React, Next.js, TypeScript, and Sass patterns.
- Use the existing Prettier settings:
  - 2 spaces
  - semicolons
  - double quotes
  - trailing commas
  - 80 character print width
- Avoid broad formatting-only changes in upstream files.
- Keep user-facing text and configuration easy to localize when possible.

## Verification

Choose verification based on the size and risk of the change.

Recommended checks:

```bash
yarn lint
yarn test:ci
yarn build
```

For small documentation-only changes, no runtime verification is required.

## Upstream Sync

The original project remote is kept as `upstream`.

Recommended flow:

```bash
git fetch upstream
git switch main
git merge upstream/main
```

Before syncing upstream changes, make sure local feature work is committed or
stashed, and record the sync in `.agents/WORKLOG.md`.

## Documentation Duty

Update these files as part of normal development:

- `.agents/WORKLOG.md`: what changed and why
- `.agents/HANDOFF.md`: current state, risks, and next steps
- `.agents/DECISIONS.md`: lasting technical decisions
- `.agents/TODO.md`: pending work
