import type { Rarity } from "@/constants/databaseTypes";
import type { AppDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  Item,
  itemsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import { findActiveStorageById, DEFAULT_CONTAINER_NAME } from "./containers";
import { and, eq, isNull } from "drizzle-orm";

type RepositoryTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];

export type ItemDetails = {
  name: string;
  description: string | null;
  item_type: string;
  weight: number;
  rarity: Rarity;
  quantity: number;
  properties: unknown;
};

export type ItemCreateInput = {
  storage_location_id: number;
  character_id: number;
  name: string;
  description: string | null;
  item_type: string;
  weight: number;
  rarity?: Rarity;
  properties?: unknown;
  quantity?: number;
};

const loadItemByIdInTransaction = (
  tx: RepositoryTransaction,
  itemId: number,
): Item | undefined =>
  tx
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)))
    .get();

const findOrCreateCarryingStorageInTransaction = (
  tx: RepositoryTransaction,
  characterId: number,
) => {
  const existing = tx
    .select()
    .from(storageLocationsTable)
    .where(
      and(
        eq(storageLocationsTable.character_id, characterId),
        eq(storageLocationsTable.carrying, true),
        isNull(storageLocationsTable.deleted_at),
      ),
    )
    .get();
  if (existing !== undefined) {
    return existing;
  }
  return tx
    .insert(storageLocationsTable)
    .values({
      character_id: characterId,
      name: DEFAULT_CONTAINER_NAME,
      description: null,
      weight: 0,
      is_fixed_weight: false,
      carrying: true,
      rarity: "Common",
      properties: null,
    })
    .returning()
    .get();
};

export const createItem = async (
  db: AppDatabase,
  values: ItemCreateInput,
): Promise<Item> => {
  const inserted = await db.insert(itemsTable).values(values).returning();
  const item = inserted[0];
  if (item === undefined) {
    throw new Error("Item insert failed");
  }
  return item;
};

export const loadItemById = async (
  db: AppDatabase,
  itemId: number,
): Promise<Item | undefined> =>
  db.query.itemsTable.findFirst({
    where: and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)),
  });

export const updateItemDetails = async (
  db: AppDatabase,
  itemId: number,
  details: ItemDetails,
): Promise<void> => {
  await db
    .update(itemsTable)
    .set(details)
    .where(eq(itemsTable.item_id, itemId));
};

export const deleteItemRow = async (
  db: AppDatabase,
  itemId: number,
): Promise<void> => {
  await db
    .update(itemsTable)
    .set({ deleted_at: new Date() })
    .where(eq(itemsTable.item_id, itemId));
};

export const removeOneFromStack = async (
  db: AppDatabase,
  itemId: number,
): Promise<void> => {
  const item = await loadItemById(db, itemId);
  if (item === undefined) {
    return;
  }
  if (item.quantity <= 1) {
    await deleteItemRow(db, itemId);
    return;
  }
  await db
    .update(itemsTable)
    .set({ quantity: item.quantity - 1 })
    .where(eq(itemsTable.item_id, itemId));
};

export const splitItemStack = async (
  db: AppDatabase,
  itemId: number,
  amount: number,
  destinationStorageId: number,
): Promise<void> => {
  db.transaction((tx) => {
    const item = loadItemByIdInTransaction(tx, itemId);
    if (item === undefined) {
      throw new Error("Item not found");
    }
    if (!Number.isInteger(amount) || amount < 1) {
      throw new Error("Split amount must be at least 1");
    }
    if (amount >= item.quantity) {
      throw new Error("Split amount must be less than the stack quantity");
    }
    const destination = tx
      .select()
      .from(storageLocationsTable)
      .where(
        and(
          eq(storageLocationsTable.storage_location_id, destinationStorageId),
          isNull(storageLocationsTable.deleted_at),
        ),
      )
      .get();
    if (destination === undefined) {
      throw new Error("Destination container not found");
    }
    if (destination.character_id !== item.character_id) {
      throw new Error("Destination container belongs to another character");
    }
    if (destination.storage_location_id === item.storage_location_id) {
      throw new Error("Destination container is the current container");
    }
    tx.insert(itemsTable)
      .values({
        storage_location_id: destinationStorageId,
        character_id: item.character_id,
        name: item.name,
        description: item.description,
        item_type: item.item_type,
        weight: item.weight,
        rarity: item.rarity,
        properties: item.properties,
        quantity: amount,
      })
      .run();
    tx.update(itemsTable)
      .set({ quantity: item.quantity - amount })
      .where(eq(itemsTable.item_id, itemId))
      .run();
  });
};

export const moveItemToContainer = async (
  db: AppDatabase,
  itemId: number,
  destinationStorageId: number,
): Promise<void> => {
  const item = await loadItemById(db, itemId);
  if (item === undefined) {
    throw new Error("Item not found");
  }
  const destination = await findActiveStorageById(db, destinationStorageId);
  if (destination === undefined) {
    throw new Error("Destination container not found");
  }
  if (destination.character_id !== item.character_id) {
    throw new Error("Destination container belongs to another character");
  }
  if (destination.storage_location_id === item.storage_location_id) {
    return;
  }
  await db
    .update(itemsTable)
    .set({ storage_location_id: destinationStorageId })
    .where(eq(itemsTable.item_id, itemId));
};

export const transferItemToCharacter = async (
  db: AppDatabase,
  itemId: number,
  targetCharacterId: number,
): Promise<void> => {
  db.transaction((tx) => {
    const item = loadItemByIdInTransaction(tx, itemId);
    if (item === undefined) {
      throw new Error("Item not found");
    }
    if (item.character_id === targetCharacterId) {
      return;
    }
    const sourceCharacter = tx
      .select()
      .from(charactersTable)
      .where(
        and(
          eq(charactersTable.character_id, item.character_id),
          isNull(charactersTable.deleted_at),
        ),
      )
      .get();
    const targetCharacter = tx
      .select()
      .from(charactersTable)
      .where(
        and(
          eq(charactersTable.character_id, targetCharacterId),
          isNull(charactersTable.deleted_at),
        ),
      )
      .get();
    if (sourceCharacter === undefined || targetCharacter === undefined) {
      throw new Error("Character not found");
    }
    const onPerson = findOrCreateCarryingStorageInTransaction(
      tx,
      targetCharacterId,
    );
    tx.update(itemsTable)
      .set({
        character_id: targetCharacterId,
        storage_location_id: onPerson.storage_location_id,
      })
      .where(eq(itemsTable.item_id, itemId))
      .run();
    tx.insert(ledgerTable)
      .values([
        {
          message: `Transferred ${item.name} x${item.quantity} to ${targetCharacter.name}`,
          character_id: item.character_id,
        },
        {
          message: `Received ${item.name} x${item.quantity} from ${sourceCharacter.name}`,
          character_id: targetCharacterId,
        },
      ])
      .run();
  });
};
