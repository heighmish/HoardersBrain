import { Rarity } from "@/constants/databaseTypes";
import {
  charactersTable,
  Item,
  itemsTable,
  ledgerTable,
  schema,
  storageLocationsTable,
  Storage,
} from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";

export const ON_PERSON_NAME = "On Person";

export type ItemFlowDb =
  | BetterSQLite3Database<typeof schema>
  | ExpoSQLiteDatabase<typeof schema>;

export type ItemDetails = {
  name: string;
  description: string | null;
  item_type: string;
  weight: number;
  rarity: Rarity;
  quantity: number;
  properties: unknown;
};

export const loadItemById = async (
  db: ItemFlowDb,
  itemId: number,
): Promise<Item | undefined> =>
  db.query.itemsTable.findFirst({
    where: and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)),
  });

export const loadStorageById = async (
  db: ItemFlowDb,
  storageId: number,
): Promise<Storage | undefined> =>
  db.query.storageLocationsTable.findFirst({
    where: and(
      eq(storageLocationsTable.storage_location_id, storageId),
      isNull(storageLocationsTable.deleted_at),
    ),
  });

export const updateItemDetails = async (
  db: ItemFlowDb,
  itemId: number,
  details: ItemDetails,
): Promise<void> => {
  await db.update(itemsTable).set(details).where(eq(itemsTable.item_id, itemId));
};

export const deleteItemRow = async (
  db: ItemFlowDb,
  itemId: number,
): Promise<void> => {
  await db
    .update(itemsTable)
    .set({ deleted_at: new Date() })
    .where(eq(itemsTable.item_id, itemId));
};

export const removeOneFromStack = async (
  db: ItemFlowDb,
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
  db: ItemFlowDb,
  itemId: number,
  amount: number,
  destinationStorageId: number,
): Promise<void> => {
  const item = await loadItemById(db, itemId);
  if (item === undefined) {
    throw new Error("Item not found");
  }
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error("Split amount must be at least 1");
  }
  if (amount >= item.quantity) {
    throw new Error("Split amount must be less than the stack quantity");
  }
  const destination = await loadStorageById(db, destinationStorageId);
  if (destination === undefined) {
    throw new Error("Destination container not found");
  }
  if (destination.character_id !== item.character_id) {
    throw new Error("Destination container belongs to another character");
  }
  if (destination.storage_location_id === item.storage_location_id) {
    throw new Error("Destination container is the current container");
  }
  await db.insert(itemsTable).values({
    storage_location_id: destinationStorageId,
    character_id: item.character_id,
    name: item.name,
    description: item.description,
    item_type: item.item_type,
    weight: item.weight,
    rarity: item.rarity,
    properties: item.properties,
    quantity: amount,
  });
  await db
    .update(itemsTable)
    .set({ quantity: item.quantity - amount })
    .where(eq(itemsTable.item_id, itemId));
};

export const moveItemToContainer = async (
  db: ItemFlowDb,
  itemId: number,
  destinationStorageId: number,
): Promise<void> => {
  const item = await loadItemById(db, itemId);
  if (item === undefined) {
    throw new Error("Item not found");
  }
  const destination = await loadStorageById(db, destinationStorageId);
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

export const findOrCreateCarryingStorage = async (
  db: ItemFlowDb,
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
  const inserted = await db
    .insert(storageLocationsTable)
    .values({
      character_id: characterId,
      name: ON_PERSON_NAME,
      weight: 0,
      carrying: true,
      is_fixed_weight: false,
    })
    .returning();
  const storage = inserted[0];
  if (storage === undefined) {
    throw new Error("Carrying container insert failed");
  }
  return storage;
};

export const transferItemToCharacter = async (
  db: ItemFlowDb,
  itemId: number,
  targetCharacterId: number,
): Promise<void> => {
  const item = await loadItemById(db, itemId);
  if (item === undefined) {
    throw new Error("Item not found");
  }
  if (item.character_id === targetCharacterId) {
    return;
  }
  const onPerson = await findOrCreateCarryingStorage(db, targetCharacterId);
  const sourceCharacter = await db.query.charactersTable.findFirst({
    where: eq(charactersTable.character_id, item.character_id),
  });
  const targetCharacter = await db.query.charactersTable.findFirst({
    where: eq(charactersTable.character_id, targetCharacterId),
  });
  if (sourceCharacter === undefined || targetCharacter === undefined) {
    throw new Error("Character not found");
  }
  await db
    .update(itemsTable)
    .set({
      character_id: targetCharacterId,
      storage_location_id: onPerson.storage_location_id,
    })
    .where(eq(itemsTable.item_id, itemId));
  await db.insert(ledgerTable).values([
    {
      message: `Transferred ${item.name} x${item.quantity} to ${targetCharacter.name}`,
      character_id: item.character_id,
    },
    {
      message: `Received ${item.name} x${item.quantity} from ${sourceCharacter.name}`,
      character_id: targetCharacterId,
    },
  ]);
};
