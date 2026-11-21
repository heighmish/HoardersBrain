import { schema, Storage, storageLocationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

export type StorageInput = Omit<
  Storage,
  "storage_location_id" | "weight" | "deleted_at"
>;

type LifecycleDatabase<TRunResult> = BaseSQLiteDatabase<
  "sync",
  TRunResult,
  typeof schema
>;

export const updateStorageContainer = <TRunResult>(
  db: LifecycleDatabase<TRunResult>,
  storageId: number,
  values: StorageInput & { weight: number },
): void => {
  db.update(storageLocationsTable)
    .set(values)
    .where(eq(storageLocationsTable.storage_location_id, storageId))
    .run();
};

export const deleteStorageContainer = <TRunResult>(
  db: LifecycleDatabase<TRunResult>,
  storage: Storage,
): void => {
  db.update(storageLocationsTable)
    .set({ deleted_at: new Date() })
    .where(
      eq(
        storageLocationsTable.storage_location_id,
        storage.storage_location_id,
      ),
    )
    .run();
};
