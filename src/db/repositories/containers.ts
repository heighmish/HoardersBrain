import type { AppDatabase } from "@/db/DatabaseProvider";
import { Storage, storageLocationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";

export const DEFAULT_CONTAINER_NAME = "Equipped";

export type StorageInput = Omit<
  Storage,
  "storage_location_id" | "weight" | "deleted_at"
>;

export const createStorageContainer = async (
  db: AppDatabase,
  values: StorageInput & { weight: number },
): Promise<Storage> => {
  const inserted = await db
    .insert(storageLocationsTable)
    .values(values)
    .returning();
  const storage = inserted[0];
  if (storage === undefined) {
    throw new Error("Container insert failed");
  }
  return storage;
};

export const updateStorageContainer = async (
  db: AppDatabase,
  storageId: number,
  values: StorageInput & { weight: number },
): Promise<void> => {
  await db
    .update(storageLocationsTable)
    .set(values)
    .where(eq(storageLocationsTable.storage_location_id, storageId));
};

export const softDeleteStorageContainer = async (
  db: AppDatabase,
  storageId: number,
): Promise<void> => {
  await db
    .update(storageLocationsTable)
    .set({ deleted_at: new Date() })
    .where(eq(storageLocationsTable.storage_location_id, storageId));
};
