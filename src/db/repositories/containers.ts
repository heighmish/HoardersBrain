import type { AppDatabase } from "@/db/DatabaseProvider";
import { Storage, storageLocationsTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";

export const ON_PERSON_NAME = "On Person";

export type StorageInput = Omit<
  Storage,
  "storage_location_id" | "weight" | "deleted_at"
>;

export const findActiveStorageById = async (
  db: AppDatabase,
  storageId: number,
): Promise<Storage | undefined> =>
  db.query.storageLocationsTable.findFirst({
    where: and(
      eq(storageLocationsTable.storage_location_id, storageId),
      isNull(storageLocationsTable.deleted_at),
    ),
  });

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

export const findOrCreateCarryingStorage = async (
  db: AppDatabase,
  characterId: number,
): Promise<Storage> => {
  const existing = await db.query.storageLocationsTable.findFirst({
    where: and(
      eq(storageLocationsTable.character_id, characterId),
      eq(storageLocationsTable.carrying, true),
      isNull(storageLocationsTable.deleted_at),
    ),
  });
  if (existing !== undefined) {
    return existing;
  }
  return createStorageContainer(db, {
    character_id: characterId,
    name: ON_PERSON_NAME,
    description: null,
    weight: 0,
    is_fixed_weight: false,
    carrying: true,
    rarity: "Common",
    properties: null,
  });
};
