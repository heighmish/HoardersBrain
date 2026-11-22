# HoardersBrain

Local-first Expo / React Native tabletop RPG inventory and encumbrance tracker.

## Expo docs

Expo SDK APIs change every release. Before using an Expo or React Native API, check the major version of `expo` in `package.json` and verify against `https://docs.expo.dev/versions/v<major>.0.0/` or `https://docs.expo.dev/llms.txt`.

## Commands

```bash
npx expo install <package>              # install SDK-compatible packages
npx expo start                          # Metro dev server (interactive dev only)
npm run check                           # oxlint + tsc --noEmit + design-token guardrail
npx expo run:ios --configuration Release # Release build for Maestro merge gates
```

Run `npm run check` before declaring any task done.

## Architecture

- **Routing**: Expo Router under `src/app/` (`_layout.tsx` navigators, screen files). Non-route code lives in `src/` outside `src/app/`, imported via `@/*`.
- **Layered boundaries**: Screens own navigation, local UI state, and layout. Writes go through the repository layer, reusable live-query subscriptions live in hooks, and pure domain logic (encumbrance, currency, parsing) lives in framework-free utilities.
- **Local-first SQLite**: Drizzle on `expo-sqlite` — multi-step writes run inside synchronous `db.transaction` callbacks, and active queries filter out soft-deleted rows (`deleted_at`).
- **Encumbrance**: Carried weight includes only `carrying = true` containers; fixed-weight containers exclude their contents' weight.

## UI & copy

- Follow `TOKENS.md` for theming, primitives, navigation chrome, and layout checks.
- Write functional labels and neutral placeholders only — product copy, taglines, and empty-state prose are owner-written.
- Comments are for non-obvious constraints only (platform bugs, required call order, sanctioned off-grid tokens).

## Verification

1. `npm run check` — lint, typecheck, and design-token checks.
2. On-device verification against the development build.
3. Maestro E2E (`.maestro/`) — merge gates only, run by the coordinator against the Release build (`~/.maestro/bin/maestro test <flow> --platform ios`).

Keep visible labels and `testID`s stable across UI changes, or update affected `.maestro/` flows in the same commit. In new flows (`appId: com.heighmish.HoardersBrain`, tag `e2e`), harden the first assertion after `launchApp` with `extendedWaitUntil` (timeout `60000`) and assert on text/`testID`s only. Visual changes run `.maestro/design-screens.yaml` at the gate for before/after screenshots.

## Git & review

- **Branches**: `type/summary` in lowercase kebab-case (e.g. `feat/soft-deletion`, `fix/sheet-inset`), created before the first commit.
- **Commits & PRs**: `type(scope): summary` (imperative, lowercase, no trailing period). Reuse existing scopes (`ui`, `items`, `storage`, `character`, `settings`, `theme`, `maestro`, `roadmap`, `db`, `config`) when they fit.
- **Pre-commit review**: Run a read-only review pass on `git diff main...HEAD` focused on bugs, crashes, broken `testID`s, and regressions; verify findings against the code before acting.
- **Replicability**: Never commit machine-specific data (local IPs, absolute paths, device/simulator UDIDs, machine names).

## Parallel & delegated work

- Touch only files in your assigned scope; keep edits to shared files (`src/app/_layout.tsx`, `package.json`) minimal.
- Source-of-truth docs (`AGENTS.md`, `TOKENS.md`, `ROADMAP.md`, `README.md`) are updated only by the coordinator/owner.
- Only one agent owns schema changes and `drizzle-kit generate` at a time.
- Parallel agents work in separate worktrees; device and Maestro gate runs happen serially on the coordinator branch after merge.
- Reports state what was run and its result (or `No UI change.` when nothing visible changed).
