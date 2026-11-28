import type { AppDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  Item,
  itemsTable,
  itemTagsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import { DEFAULT_CONTAINER_NAME } from "./containers";
import {
  remapItemTagsInTransaction,
  setItemTagsInTransaction,
} from "./tags";
import {
  amountToCopper,
  CoinDenomination,
  creditPurse,
  deductFromPurse,
  formatCoinAmount,
} from "@/utils/currency";
import { NonNegativeNumber, PositiveInt } from "@/utils/numbers";
import { and, eq, isNull } from "drizzle-orm";

type RepositoryTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];

export type ItemDetails = Omit<
  Pick<
    Item,
    | "name"
    | "description"
    | "rarity"
    | "value_currency"
    | "properties"
  >,
  never
> & {
  weight: NonNegativeNumber;
  quantity: PositiveInt;
  value: NonNegativeNumber | null;
};

export type ItemCreateInput = Omit<
  typeof itemsTable.$inferInsert,
  "item_id" | "deleted_at" | "weight" | "quantity" | "value"
> & {
  weight: NonNegativeNumber;
  quantity: PositiveInt;
  value: NonNegativeNumber | null;
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
      amount: NonNegativeNumber;
      denomination: CoinDenomination;
      deductFromPurse: boolean;
      note?: string;
    };

export type ItemRemoval =
  | {
      kind: "sold";
      quantity: PositiveInt;
      amount: NonNegativeNumber;
      denomination: CoinDenomination;
      addToPurse: boolean;
      note?: string;
    }
  | {
      kind: "dropped";
      quantity: PositiveInt;
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

export const updateItemDetails = async (
  db: AppDatabase,
  itemId: number,
  details: ItemDetails,
  tagIds?: readonly number[],
): Promise<void> => {
  db.transaction((tx) => {
    const item = loadItemByIdInTransaction(tx, itemId);
    if (item === undefined) {
      throw new Error("Item not found");
    }

    const trimmedDescription =
      details.description === null ? null : details.description.trim();
    const description =
      trimmedDescription !== null && trimmedDescription.length === 0
        ? null
        : trimmedDescription;

    tx.update(itemsTable)
      .set({ ...details, description })
      .where(and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)))
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

const decrementItemInTransaction = (
  tx: RepositoryTransaction,
  itemId: number,
  buildLedgerMessage?: (item: Item) => string,
): void => {
  const item = loadItemByIdInTransaction(tx, itemId);
  if (item === undefined) {
    return;
  }
  if (item.quantity <= 1) {
    tx.update(itemsTable)
      .set({ deleted_at: new Date() })
      .where(eq(itemsTable.item_id, itemId))
      .run();
  } else {
    tx.update(itemsTable)
      .set({ quantity: item.quantity - 1 })
      .where(eq(itemsTable.item_id, itemId))
      .run();
  }
  if (buildLedgerMessage !== undefined) {
    tx.insert(ledgerTable)
      .values({
        character_id: item.character_id,
        message: buildLedgerMessage(item),
      })
      .run();
  }
};

export const useOneFromItem = async (
  db: AppDatabase,
  itemId: number,
): Promise<void> => {
  db.transaction((tx) => {
    decrementItemInTransaction(tx, itemId, (item) => `Used ${item.name}`);
  });
};

const formatLedgerRemoval = (
  name: string,
  quantity: number,
  removal: ItemRemoval,
  credited: boolean,
): string => {
  const qtyLabel = `${name} x${quantity}`;
  const note = removal.note?.trim();
  const noteSuffix = note && note.length > 0 ? ` — ${note}` : "";

  if (removal.kind === "dropped") {
    return `Dropped ${qtyLabel}${noteSuffix}`;
  }
  if (removal.amount <= 0) {
    return `Sold ${qtyLabel}${noteSuffix}`;
  }

  const pricePart = formatCoinAmount(removal.amount, removal.denomination);
  return credited
    ? `Sold ${qtyLabel} for ${pricePart}${noteSuffix}`
    : `Sold ${qtyLabel} (${pricePart}, not added to purse${noteSuffix})`;
};

const creditCharacterPurseInTransaction = (
  tx: RepositoryTransaction,
  characterId: number,
  amount: NonNegativeNumber,
  denomination: CoinDenomination,
): boolean => {
  if (amountToCopper(amount, denomination) <= 0) {
    return false;
  }

  const character = tx
    .select()
    .from(charactersTable)
    .where(
      and(
        eq(charactersTable.character_id, characterId),
        isNull(charactersTable.deleted_at),
      ),
    )
    .get();
  if (character === undefined) {
    return false;
  }

  const nextPurse = creditPurse(
    {
      platinum: character.platinum,
      gold: character.gold,
      silver: character.silver,
      copper: character.copper,
    },
    amount,
    denomination,
  );
  tx.update(charactersTable)
    .set(nextPurse)
    .where(eq(charactersTable.character_id, characterId))
    .run();
  return true;
};

export const removeItemsFromStack = async (
  db: AppDatabase,
  itemId: number,
  removal: ItemRemoval,
): Promise<{ removedAll: boolean }> =>
  db.transaction((tx) => {
    const item = loadItemByIdInTransaction(tx, itemId);
    if (item === undefined) {
      throw new Error("Item not found");
    }
    if (removal.quantity > item.quantity) {
      throw new Error("Removal quantity exceeds stack size");
    }

    const removedAll = removal.quantity === item.quantity;
    tx.update(itemsTable)
      .set(
        removedAll
          ? { deleted_at: new Date() }
          : { quantity: item.quantity - removal.quantity },
      )
      .where(eq(itemsTable.item_id, itemId))
      .run();

    const credited =
      removal.kind === "sold" && removal.addToPurse && removal.amount > 0
        ? creditCharacterPurseInTransaction(
            tx,
            item.character_id,
            removal.amount,
            removal.denomination,
          )
        : false;

    tx.insert(ledgerTable)
      .values({
        character_id: item.character_id,
        message: formatLedgerRemoval(
          item.name,
          removal.quantity,
          removal,
          credited,
        ),
      })
      .run();

    return { removedAll };
  });

export const splitItemStack = async (
  db: AppDatabase,
  itemId: number,
  amount: PositiveInt,
  destinationStorageId: number,
): Promise<void> => {
  db.transaction((tx) => {
    const item = loadItemByIdInTransaction(tx, itemId);
    if (item === undefined) {
      throw new Error("Item not found");
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
  db.transaction((tx) => {
    const item = loadItemByIdInTransaction(tx, itemId);
    if (item === undefined) {
      throw new Error("Item not found");
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
      return;
    }
    tx.update(itemsTable)
      .set({ storage_location_id: destinationStorageId })
      .where(eq(itemsTable.item_id, itemId))
      .run();
  });
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
