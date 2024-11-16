import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { migrate, useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import * as SQLite from "expo-sqlite";
import migrations from "../drizzle/migrations";
import { itemsTable, ledger, schema, storageLocationsTable } from "@/db/schema";

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

    (async () => {})();
  }, [success]);

  if (error) {
    console.log("Failed to apply migrations", error);
    throw new Error();
  }
  /*useEffect(() => {
    const applyMigrations = async () => {
      try {
        await migrate(db, migrations);
        console.log("Migrations applied successfully");
        // await db.delete(charactersTable);
        // await db.delete(itemsTable);
        // await db.delete(storageLocationsTable);
        // await db.delete(ledger);
      } catch (error) {
        console.error("Failed to apply migrations", error);
      }
    };
    applyMigrations();
  }, [db]); */

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
