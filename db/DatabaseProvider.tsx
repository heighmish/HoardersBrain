import { ExpoSQLiteDatabase, drizzle } from "drizzle-orm/expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import * as SQLite from "expo-sqlite";
import migrations from "../drizzle/migrations";

const DatabaseContext = createContext<ExpoSQLiteDatabase | undefined>(
  undefined,
);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  const [db, sqliteDb] = useMemo(() => {
    const sqliteDb = SQLite.openDatabaseSync("hoardersbrain.db");
    return [drizzle(sqliteDb), sqliteDb];
  }, []);

  useDrizzleStudio(sqliteDb);

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
  }, [db]);

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
