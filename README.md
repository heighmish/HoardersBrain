# HoardersBrain

A mobile inventory and encumbrance tracker for tabletop RPGs — D&D 5e, Pathfinder, and friends.

Track multiple characters, each with their own coin purse, containers (backpack, belt pouch, on-person), and items with weight, quantity, and rarity. Everything is local-first: data lives in a SQLite database on the device.

The product roadmap lives in [ROADMAP.md](ROADMAP.md).

## Stack

- Expo SDK 58 / React Native 0.88 with Expo Router
- expo-sqlite + Drizzle ORM for storage
- oxlint + tsc for checks, Maestro for E2E
- expo-dev-client — this project uses a development build, not Expo Go

## Running the app

```bash
npm install
npx expo start
```

`npx expo start` serves a development build installed on your device or simulator. To build and install one:

```bash
npm run ios      # or: npm run android
```

## Commands

```bash
npx expo start   # Metro dev server
npm run check    # oxlint + tsc + design-token guardrail, run before committing
```

## Database

The schema is defined in `src/db/schema.ts` with Drizzle. On launch, `DatabaseProvider` opens `hoardersbrain.db` in WAL mode, applies any pending migrations, and only renders the app once migrations have succeeded. Foreign keys are enforced (`PRAGMA foreign_keys = ON`).

Generate migrations with Drizzle Kit:

```bash
npx drizzle-kit generate
```

Generated SQL lands in `src/drizzle/` and is barrel-exported through `src/drizzle/migrations.js`, which the migrator loads — new migration files are picked up automatically on the next launch.

During development, the database can be inspected with Drizzle Studio via the `expo-drizzle-studio-plugin` hook in `DatabaseProvider`.

## Project layout

- `src/app/` — Expo Router screens and layouts
- `src/components/` — feature components and `Basic/` design-system primitives
- `src/db/` — Drizzle schema, `DatabaseProvider`, and `repositories/`
- `src/hooks/` — reusable React / live-query hooks
- `src/utils/` — pure domain and parsing helpers
- `src/stores/` — React context stores (`ThemeContext`, `CharacterContext`)
- `src/constants/` — theme tokens, presets, rarity palette, shared types
- `src/drizzle/` — generated SQLite migrations
- `.maestro/` — E2E flows

## Verification

- Static checks (`npm run check`): oxlint, TypeScript (`tsc --noEmit`), and the design-token guardrail (`scripts/lint-design-tokens.sh`).
- On-device verification: run against the development build via `npx expo start`.
- E2E flows with Maestro (merge gates only; requires macOS + Xcode and a booted simulator; install Maestro per https://docs.maestro.dev — the CLI lands in `~/.maestro/bin` and is not on PATH):

```bash
~/.maestro/bin/maestro test .maestro/create-storage-e2e.yaml --platform ios
```

Merge gates run against a stable target: `npx expo run:ios --configuration Release` rebuilds the app with the JS embedded (no Metro dependency) before a gate run.
