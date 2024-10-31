import { ExpoSQLiteDatabase, drizzle } from "drizzle-orm/expo-sqlite";
import { createContext, useContext, useEffect, useMemo } from "react";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as SQLite from "expo-sqlite";
import migrations from "../drizzle/migrations";

import { charactersTable } from "./schema";

const DatabaseContext = createContext<ExpoSQLiteDatabase | undefined>(
  undefined,
);

export const DatabaseProvider = ({ children }) => {
  const db = useMemo(() => {
    const sqliteDb = SQLite.openDatabaseSync("hoardersbrain.db");
    return drizzle(sqliteDb);
  }, []);

  useEffect(() => {
    const applyMigrations = async () => {
      try {
        await migrate(db, migrations);
        console.log("Migrations applied successfully");
      } catch (error) {
        console.error("Failed to apply migrations", error);
      }
    };
    applyMigrations();
  }, []);

  return (
    <DatabaseContext.Provider value={db}>{children}</DatabaseContext.Provider>
  );
};

export const useDatabase = (): ExpoSQLiteDatabase<Record<string, never>> => {
  var context = useContext(DatabaseContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a database provider");
  }
  return context;
};
