import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
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
  const [db, sqliteDb] = useMemo(() => {
    const sqliteDb = SQLite.openDatabaseSync("hoardersbrain.db", {
      enableChangeListener: true,
    });
    return [
      drizzle(sqliteDb, {
        schema: schema,
      }),
      sqliteDb,
    ];
  }, []);

  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    if (!success) return;

    console.log("Successfully applied database migrations");
  }, [success]);

  if (error) {
    console.log("Failed to apply migrations", error);
    throw new Error(error.message);
  }

  useDrizzleStudio(sqliteDb);

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
