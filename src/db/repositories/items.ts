import type { Rarity } from "@/constants/databaseTypes";
import type { AppDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  Item,
  itemsTable,
  itemTagsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import { findActiveStorageById, DEFAULT_CONTAINER_NAME } from "./containers";
import {
  remapItemTagsInTransaction,
  setItemTagsInTransaction,
} from "./tags";
import {
  CoinDenomination,
  deductFromPurse,
} from "@/utils/currency";
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
  value: number | null;
  value_currency: CoinDenomination | null;
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
  value?: number | null;
  value_currency?: CoinDenomination | null;
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

export type ItemAcquisition =
  | { kind: "looted" | "found"; note?: string }
  | {
      kind: "bought";
      amount: number;
      denomination: CoinDenomination;
      deductFromPurse: boolean;
      note?: string;
    };

const formatLedgerAcquisition = (
  name: string,
  quantity: number,
  acquisition: ItemAcquisition,
  deducted: boolean,
): string => {
  const qtyLabel = `${name} x${quantity}`;
  const note = acquisition.note?.trim();
  const noteSuffix = note && note.length > 0 ? ` — ${note}` : "";

  if (acquisition.kind !== "bought") {
    const label = acquisition.kind === "looted" ? "Looted" : "Found";
    return `${label} ${qtyLabel}${noteSuffix}`;
  }

  const costPart =
    acquisition.amount > 0
      ? `${acquisition.amount} ${acquisition.denomination}`
      : "0 gp";
  if (acquisition.amount > 0 && !deducted) {
    return `Bought ${qtyLabel} (${costPart}, not deducted${noteSuffix})`;
  }
  return `Bought ${qtyLabel} for ${costPart}${noteSuffix}`;
};

export const createItem = async (
  db: AppDatabase,
  values: ItemCreateInput,
  tagIds?: readonly number[],
  acquisition?: ItemAcquisition,
): Promise<Item> =>
  db.transaction((tx) => {
    const created = tx.insert(itemsTable).values(values).returning().get();
    if (tagIds !== undefined && tagIds.length > 0) {
      setItemTagsInTransaction(tx, created.item_id, tagIds);
    }

    if (acquisition !== undefined) {
      let deducted = false;
      if (
        acquisition.kind === "bought" &&
        acquisition.deductFromPurse &&
        acquisition.amount > 0
      ) {
        const character = tx
          .select()
          .from(charactersTable)
          .where(
            and(
              eq(charactersTable.character_id, values.character_id),
              isNull(charactersTable.deleted_at),
            ),
          )
          .get();
        if (character !== undefined) {
          const result = deductFromPurse(
            {
              platinum: character.platinum,
              gold: character.gold,
              silver: character.silver,
              copper: character.copper,
            },
            acquisition.amount,
            acquisition.denomination,
          );
          if (result.status !== "insufficient") {
            tx.update(charactersTable)
              .set(result.nextPurse)
              .where(eq(charactersTable.character_id, values.character_id))
              .run();
            deducted = true;
          }
        }
      }

      tx.insert(ledgerTable)
        .values({
          character_id: values.character_id,
          message: formatLedgerAcquisition(
            created.name,
            created.quantity,
            acquisition,
            deducted,
          ),
        })
        .run();
    }

    return created;
  });

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
  tagIds?: readonly number[],
): Promise<void> => {
  db.transaction((tx) => {
    tx.update(itemsTable)
      .set(details)
      .where(eq(itemsTable.item_id, itemId))
      .run();
    if (tagIds !== undefined) {
      setItemTagsInTransaction(tx, itemId, tagIds);
    }
  });
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
    const splitItem = tx
      .insert(itemsTable)
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
        value: item.value,
        value_currency: item.value_currency,
      })
      .returning()
      .get();
    const existingTagIds = tx
      .select({ tag_id: itemTagsTable.tag_id })
      .from(itemTagsTable)
      .where(eq(itemTagsTable.item_id, itemId))
      .all()
      .map((row) => row.tag_id);
    if (existingTagIds.length > 0) {
      setItemTagsInTransaction(tx, splitItem.item_id, existingTagIds);
    }
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
    remapItemTagsInTransaction(tx, itemId, targetCharacterId);
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
