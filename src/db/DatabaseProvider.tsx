import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SQLite from "expo-sqlite";
import migrations from "../drizzle/migrations";
import { schema } from "@/db/schema";

export type AppDatabase = ExpoSQLiteDatabase<typeof schema>;

type MigrationState =
  | { status: "migrating" }
  | { status: "ready" }
  | { status: "error"; error: Error };

const DatabaseContext = createContext<AppDatabase | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  // Lazy-initialized once; this app does not use StrictMode, and even
  // under it a second SQLite connection to the same file is harmless.
  const [{ db, sqliteDb }] = useState(() => {
    const sqliteDb = SQLite.openDatabaseSync("hoardersbrain.db", {
      enableChangeListener: true,
    });
    sqliteDb.execSync("PRAGMA journal_mode = WAL;");
    return {
      db: drizzle(sqliteDb, {
        schema: schema,
      }),
      sqliteDb,
    };
  });

  const [migrationState, setMigrationState] = useState<MigrationState>({
    status: "migrating",
  });

  useDrizzleStudio(sqliteDb);

  useEffect(() => {
    let cancelled = false;

    migrate(db, migrations)
      .then(() => {
        if (cancelled) {
          return;
        }
        // Enable FKs strictly after migrations complete (SQLite ignores
        // PRAGMA foreign_keys=OFF inside Drizzle's migration transaction)
        // and before children mount so no child effect writes without FKs.
        sqliteDb.execSync("PRAGMA foreign_keys = ON;");
        setMigrationState({ status: "ready" });
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setMigrationState({
          status: "error",
          error: err instanceof Error ? err : new Error(String(err)),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [db, sqliteDb]);

  if (migrationState.status === "error") {
    throw migrationState.error;
  }

  // Gate children on completed migrations so nothing queries the
  // database before its schema exists (matters on first launch).
  if (migrationState.status !== "ready") {
    return null;
  }

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
};

export const useDatabase = (): AppDatabase => {
  const context = useContext(DatabaseContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a database provider");
  }
  return context;
};
