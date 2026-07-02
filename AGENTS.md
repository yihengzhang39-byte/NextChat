# Agent Guide

This project is a fork of NextChat for secondary development.

## Core Rules

- Keep changes small and focused. Do not refactor unrelated upstream code.
- Read `.agents/DEVELOPMENT.md` before starting implementation work.
- Record meaningful work in `.agents/WORKLOG.md` before handing off.
- Record durable technical decisions in `.agents/DECISIONS.md`.
- Update `.agents/HANDOFF.md` when project status, risks, or next steps change.
- Prefer existing project patterns over new abstractions.

## Common Commands

- Install dependencies: `yarn install`
- Start development server: `yarn dev`
- Lint: `yarn lint`
- Test in CI mode: `yarn test:ci`
- Build: `yarn build`

## Git Remotes

- `origin`: `https://github.com/yihengzhang39-byte/NextChat.git`
- `upstream`: `https://github.com/ChatGPTNextWeb/NextChat.git`

Push product development changes to `origin`. Use `upstream` only to inspect or
sync changes from the original open-source project.
