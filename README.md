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
npm run check    # oxlint + tsc, run before committing
```

## Database

The schema is defined in `db/schema.ts` with Drizzle. On launch, `DatabaseProvider` opens `hoardersbrain.db` in WAL mode, applies any pending migrations, and only renders the app once migrations have succeeded. Foreign keys are enforced (`PRAGMA foreign_keys = ON`).

Generate migrations with Drizzle Kit:

```bash
npx drizzle-kit generate
```

Generated SQL lands in `drizzle/` and is barrel-exported through `drizzle/migrations.js`, which the migrator loads — new migration files are picked up automatically on the next launch.

During development, the database can be inspected with Drizzle Studio via the `expo-drizzle-studio-plugin` hook in `DatabaseProvider`.

## Project layout

- `app/` — Expo Router screens
- `components/` — shared UI components
- `db/` — Drizzle schema and database provider
- `stores/` — React context stores
- `constants/` — styling constants and shared types
- `drizzle/` — generated migrations
- `.maestro/` — E2E flows

## Testing

E2E flows run with Maestro against a booted device or simulator:

```bash
maestro test .maestro/create-storage-e2e.yaml
```
