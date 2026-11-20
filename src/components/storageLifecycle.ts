import { itemsTable, schema, Storage, storageLocationsTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

export const ON_PERSON_STORAGE_NAME = "On Person";

export type StorageInput = Omit<Storage, "storage_location_id" | "weight">;

export type DeleteStorageResult =
  | { status: "deleted" }
  | { status: "onPersonProtected" };

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
): DeleteStorageResult => {
  if (storage.name === ON_PERSON_STORAGE_NAME) {
    return { status: "onPersonProtected" };
  }

  return db.transaction((tx) => {
    const storedItem = tx
      .select({ item_id: itemsTable.item_id })
      .from(itemsTable)
      .where(eq(itemsTable.storage_location_id, storage.storage_location_id))
      .get();

    if (storedItem !== undefined) {
      const existingOnPerson = tx
        .select()
        .from(storageLocationsTable)
        .where(
          and(
            eq(storageLocationsTable.character_id, storage.character_id),
            eq(storageLocationsTable.name, ON_PERSON_STORAGE_NAME),
          ),
        )
        .get();
      const onPerson =
        existingOnPerson ??
        tx
          .insert(storageLocationsTable)
          .values({
            character_id: storage.character_id,
            name: ON_PERSON_STORAGE_NAME,
            description: null,
            weight: 0,
            is_fixed_weight: true,
            carrying: true,
            rarity: "Common",
            properties: null,
          })
          .returning()
          .get();

      if (onPerson === undefined) {
        throw new Error("On Person container could not be created");
      }

      tx.update(itemsTable)
        .set({ storage_location_id: onPerson.storage_location_id })
        .where(eq(itemsTable.storage_location_id, storage.storage_location_id))
        .run();
    }

    tx.delete(storageLocationsTable)
      .where(
        eq(storageLocationsTable.storage_location_id, storage.storage_location_id),
      )
      .run();

    return { status: "deleted" } as const;
  });
};
