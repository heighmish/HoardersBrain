This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npm run lint                # lint (oxlint)
npm run typecheck           # typecheck (tsc --noEmit)
npm run lint:design         # guardrail: no raw hex or fontSize in src/app, src/components
npm run check               # lint + typecheck + design-token guardrail in one command
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm run check` (lint + typecheck) before declaring any task done.

## E2E testing with Maestro

Flows live in `.maestro/`. They run against the stable Release gate build (see below) — the dev build and its Metro server (port 8081; ensure exactly one instance is running, start one with `npx expo start` if none) are for interactive development only, never a flow target. Maestro installs to `~/.maestro/bin` (https://docs.maestro.dev) and is not on PATH:

```bash
~/.maestro/bin/maestro test .maestro/create-storage-e2e.yaml --platform ios
```

- Against the Release build, `clearState` is cheap — the JS is embedded, there is no bundle download. Run flows serially and only when needed.
- Harden the first assertion after every `launchApp` with `extendedWaitUntil` (timeout 60000). Bare `assertVisible` races the bundle download and flakes.
- Assert on text and testIDs only, never colors or pixels.
- Keep visible labels and testIDs stable across UI changes. If a change must break one, update the affected flow in the same commit.
- New flows use `appId: com.heighmish.HoardersBrain`, the `e2e` tag, and a descriptive `name:`.
- Merge gates run against a stable target: `npx expo run:ios --configuration Release` rebuilds the app with the JS embedded (no Metro dependency, no dev-client launcher races) before a gate run; the dev build is for interactive development only.
- Visual changes also run `.maestro/design-screens.yaml` at the gate: it walks the core journey and saves a screenshot per state. Its screenshots are the before/after evidence the merge report requires.

### No tests

Agents do not write, add, or maintain tests. There is no unit suite (`__tests__/`,
`src/testing/`, and the jest config were removed by owner decision, Nov 2026).
Verification is:

1. `npm run check` (~15s) — lint + typecheck + the design-token guardrail, run constantly while coding.
2. On-device verification — the dev build on the owner's phone (and the Expo MCP
   automation tools when a device is connected) is the proof that behavior works.
3. Maestro E2E — golden paths only, run by the coordinating agent at merge gates
   against the Release build. Never a work-in-progress validation tool: the dev
   build's launcher races `clearState` and will burn hours.

Do not create test files, testing utilities, or test scripts. If a change risks
regression, verify it on the device and say so in the report.

## Branch names

Branch names are `type/summary`: the same types as commits, then a lowercase kebab-case summary of the work. `feat/soft-deletion`, `fix/sheet-inset`, `docs/agents-branch-names` — not `soft-delete-and-optional-weight`, and never a personal name, date, or device identifier. Create the branch before the first commit, so no PR ever starts from a non-conforming name.

## Commit messages

Every commit subject is `type(scope): summary`. Both parts are required — an unscoped `feat:` is a violation, not a style choice.

- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`.
- Scope: the area touched, lowercase, one word. Reuse a scope already in `git log` when one fits (`ui`, `items`, `storage`, `character`, `settings`, `theme`, `maestro`, `roadmap`, `db`, `config`); otherwise pick the narrowest word that names the change.
- Summary: imperative mood, lowercase, no trailing period.
- PR titles follow the same rule: `type(scope): summary`, matching the branch's dominant change. Never a free-form prose title — `gh pr create --title "feat(items): ..."`.

Before pushing or opening a PR, read back `git log <base>..HEAD --oneline`: every subject must parse as `type(scope): summary`. Retitle commits you already made (`git rebase -i` reword) rather than adding an unscoped commit on top.

## Pre-commit review

Before committing a body of work, run a cheap-model review pass on the diff of that body of work — `git diff main...HEAD`, whether or not the pieces are already committed — and judge its findings yourself:

- Model: `opencode/deepseek-v4.1-flash-free` (free), spawned read-only via the subagent tool with a strict brief — only overtly wrong things (bugs, crashes, broken testIDs, regressions); style nits and false alarms are worse than silence.
- Verify each finding against the code before acting on it. The reviewer is a smoke alarm, not an authority.
- Address the accurate findings, then commit. A clean pass commits as-is.

## Official sources win

These rules are adapted from official Expo guidance. When a rule here seems to
conflict with the sources below, the official source wins — fix the rule, not
the code.

- Expo's canonical app `AGENTS.md`: https://github.com/expo/expo/blob/main/packages/create-expo/template/agent-files/AGENTS.md
- Expo's own repo rules for agents: https://github.com/expo/expo/blob/main/AGENTS.md
- Expo design-system skill: https://github.com/expo/skills/blob/main/plugins/expo/skills/expo-design-system/SKILL.md

## Architecture

- **Layered boundaries**: Screens own navigation, local UI state, and layout. Writes go through the repository layer, reusable live-query subscriptions live in hooks, and pure domain logic (encumbrance, currency, parsing) lives in framework-free utilities.
- **Local-first SQLite**: Drizzle on `expo-sqlite` — multi-step writes run inside synchronous `db.transaction` callbacks, and active queries filter out soft-deleted rows (`deleted_at`).
- **Encumbrance**: Carried weight includes only `carrying = true` containers; fixed-weight containers exclude their contents' weight.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, db, stores, constants) in `src/` but outside `src/app/`. The `@/*` path alias maps to `src/*`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Read `TOKENS.md` before building or restyling UI — it is the design guide: the `useTheme` API, primitives, the copy ban, footguns, layout regression checks, and the verification rules.
- Do not write user-facing copy. Functional labels and neutral placeholders only; taglines, flavor, and empty-state prose are owner-written or approved — use placeholder text and flag it in your report when unsure.
- Comments are for constraints only. Never add a comment that repeats the code, narrates the change, or holds a bug's history — that belongs in the commit message. Keep a comment only when the code cannot show the constraint: a platform bug, a required call order, a value you must not change, or a sanctioned one-off token value (TOKENS.md). Delete a comment your change makes false.
- Keep the repo replicable on any machine: never commit personal or environment-specific data — local IPs, absolute paths, device or simulator UDIDs, machine names. Write `~` for home directories, repo-relative paths for files, and document setup steps instead of machine state.

## Code style

- Prefer `const` over `let`; use early returns where they read well.
- Avoid the `any` type.

## Working as a delegated agent

This repo is often worked on by several agents in parallel. When a task arrives with an explicit scope:

- Touch only the files your task owns. Shared files (`src/app/_layout.tsx`, `package.json`) are merged centrally — keep edits there minimal.
- **Never edit source-of-truth markdown docs** (`AGENTS.md`, `TOKENS.md`, `ROADMAP.md`, `README.md`) as a delegated worker unless explicitly instructed; they are maintained by the coordinator/owner. Report any doc drift in your handoff.
- Exactly one agent owns schema changes at a time. Never run `drizzle-kit generate` unless your task explicitly grants migration ownership; concurrent generations corrupt the drizzle journal.
- A solo agent works directly on a feature branch in the main tree (Metro serves it for E2E). Parallel agents work in separate worktrees and leave device flows to the coordinator, who runs E2E serially after each merge.
- Commit small conventional commits on your branch.
- Report done only when `npm run check` passes and your final diff has passed a pre-commit review pass (see above). Behavior changes are verified on the device (see No tests).
- Reports state what you ran and the result. A change a person can see gets before/after screenshots at the merge gate, from the platforms actually run; name any platform you could not run. If nothing visible changes, say `No UI change.`
