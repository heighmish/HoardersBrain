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
npm run test                # unit tests (jest-expo, in-memory sqlite)
npm run check               # lint + typecheck in one command
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm run check` (lint + typecheck) before declaring any task done.

## E2E testing with Maestro

Flows live in `.maestro/`. They run against a booted simulator with the dev build installed; a Metro server on port 8081 serves this repo — reuse the running instance, never start a second one. The CLI is not on PATH:

```bash
~/.maestro/bin/maestro test .maestro/create-storage-e2e.yaml --platform ios
```

- Each flow takes ~1.5–2 minutes. The cost is `launchApp` with `clearState: true` re-downloading the bundle, not the tap-through — run flows serially and only when needed.
- Harden the first assertion after every `launchApp` with `extendedWaitUntil` (timeout 60000). Bare `assertVisible` races the bundle download and flakes.
- Assert on text and testIDs only, never colors or pixels.
- Keep visible labels and testIDs stable across UI changes. If a change must break one, update the affected flow in the same commit.
- New flows use `appId: com.heighmish.HoardersBrain`, the `e2e` tag, and a descriptive `name:`.

### Test cadence

Climb the verification ladder in order, and never skip straight to a device:

1. `npm run check` (~15s) — lint + typecheck, run constantly while coding.
2. `npm run test` — jest-expo unit suite. DB and logic run against the real migrations on in-memory better-sqlite3 (`testing/db.ts`, `createTestDb()`); components render via @testing-library/react-native (AsyncStorage is globally mocked). Milliseconds per test — this is the loop you iterate in.
3. Maestro E2E (~2 min/flow) — golden paths only, run by the coordinating agent at merge gates. Never a work-in-progress validation tool: the dev build's launcher races `clearState` and will burn hours.

New logic (db mutations, helpers, stores, encumbrance math) ships with unit tests. New screens ship with a render test where practical. Anything you can prove with a unit test, prove with a unit test.

Harness notes:
- AsyncStorage is globally mocked by `jest.setup.ts`; the package's own `setupFiles` mock entry is inert under jest-expo 30, so don't re-add it.
- After `fireEvent.changeText`, flush before synchronous assertions with `await act(async () => {})`, or just use `findBy*` queries.

## Commit messages

Use conventional commit messages: `type(scope): summary`. Valid types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`. The scope is optional.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, db, stores, constants) outside `app/`. The `@/*` path alias maps to the project root.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
- Do not write code comments. Code must be self-explanatory; never add `//`, `/* */`, or JSDoc explanations.

## Code style

- Prefer `const` over `let`; use early returns where they read well.
- Avoid the `any` type.

## Working as a delegated agent

This repo is often worked on by several agents in parallel. When a task arrives with an explicit scope:

- Touch only the files your task owns. Shared files (`app/_layout.tsx`, `ROADMAP.md`) are merged centrally — keep edits there minimal.
- Exactly one agent owns schema changes at a time. Never run `drizzle-kit generate` unless your task explicitly grants migration ownership; concurrent generations corrupt the drizzle journal.
- A solo agent works directly on a feature branch in the main tree (Metro serves it for E2E). Parallel agents work in separate worktrees and leave device flows to the coordinator, who runs E2E serially after each merge.
- Commit small conventional commits on your branch. Tick the `ROADMAP.md` checkboxes for items you completed.
- Report done only when `npm run check` passes and your feature's own flow is green.
