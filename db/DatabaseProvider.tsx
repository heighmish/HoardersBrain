import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import React, {
  createContext,
  ReactNode,
  useContext,
  useState,
} from "react";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as SQLite from "expo-sqlite";
import migrations from "../drizzle/migrations";
import { schema } from "@/db/schema";

const DatabaseContext = createContext<
  ExpoSQLiteDatabase<typeof schema> | undefined
>(undefined);

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
    return {
      db: drizzle(sqliteDb, {
        schema: schema,
      }),
      sqliteDb,
    };
  });

  const { success, error } = useMigrations(db, migrations);

  if (error) {
    throw new Error(error.message);
  }

  useDrizzleStudio(sqliteDb);

  // Gate children on completed migrations so nothing queries the
  // database before its schema exists (matters on first launch).
  if (!success) {
    return null;
  }

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
};

export const useDatabase = (): ExpoSQLiteDatabase<typeof schema> => {
  const context = useContext(DatabaseContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a database provider");
  }
  return context;
};
