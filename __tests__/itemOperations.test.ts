import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import {
  deleteItemRow,
  findOrCreateOnPersonStorage,
  moveItemToContainer,
  ON_PERSON_NAME,
  removeOneFromStack,
  splitItemStack,
  transferItemToCharacter,
  updateItemDetails,
} from "@/components/itemOperations";
import { createTestDb, TestDatabase } from "@/testing/db";
import { eq } from "drizzle-orm";

const insertCharacter = async (db: TestDatabase, name: string) => {
  const inserted = await db
    .insert(charactersTable)
    .values({ name })
    .returning();
  const character = inserted[0];
  if (character === undefined) {
    throw new Error("character seed failed");
  }
  return character;
};

const insertStorage = async (
  db: TestDatabase,
  characterId: number,
  name: string,
) => {
  const inserted = await db
    .insert(storageLocationsTable)
    .values({ character_id: characterId, name, weight: 0 })
    .returning();
  const storage = inserted[0];
  if (storage === undefined) {
    throw new Error("storage seed failed");
  }
  return storage;
};

const insertItem = async (
  db: TestDatabase,
  storageId: number,
  characterId: number,
  overrides: Partial<{ name: string; quantity: number; weight: number }> = {},
) => {
  const inserted = await db
    .insert(itemsTable)
    .values({
      storage_location_id: storageId,
      character_id: characterId,
      name: overrides.name ?? "Rope of Climbing",
      item_type: "consumable",
      weight: overrides.weight ?? 1.5,
      rarity: "Uncommon",
      quantity: overrides.quantity ?? 1,
    })
    .returning();
  const item = inserted[0];
  if (item === undefined) {
    throw new Error("item seed failed");
  }
  return item;
};

const loadItem = async (db: TestDatabase, itemId: number) => {
  const item = await db.query.itemsTable.findFirst({
    where: eq(itemsTable.item_id, itemId),
  });
  if (item === undefined) {
    throw new Error("item load failed");
  }
  return item;
};

describe("item operations", () => {
  let db: TestDatabase;
  let characterId: number;
  let storageId: number;

  beforeEach(async () => {
    db = createTestDb();
    const character = await insertCharacter(db, "QA Hero");
    characterId = character.character_id;
    const storage = await insertStorage(db, characterId, "Bag of Holding");
    storageId = storage.storage_location_id;
  });

  test("updateItemDetails updates the given fields and preserves ids", async () => {
    const item = await insertItem(db, storageId, characterId);
    await updateItemDetails(db, item.item_id, {
      name: "Rope of Climbing II",
      description: "Better rope",
      item_type: "tool",
      weight: 2,
      rarity: "Rare",
      quantity: 4,
      properties: null,
    });
    const updated = await loadItem(db, item.item_id);
    expect(updated.name).toBe("Rope of Climbing II");
    expect(updated.description).toBe("Better rope");
    expect(updated.item_type).toBe("tool");
    expect(updated.weight).toBe(2);
    expect(updated.rarity).toBe("Rare");
    expect(updated.quantity).toBe(4);
    expect(updated.storage_location_id).toBe(storageId);
    expect(updated.character_id).toBe(characterId);
  });

  test("deleteItemRow removes the row", async () => {
    const item = await insertItem(db, storageId, characterId);
    await deleteItemRow(db, item.item_id);
    const remaining = await db.query.itemsTable.findMany();
    expect(remaining).toHaveLength(0);
  });

  test("removeOneFromStack decrements quantity when above one", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    await removeOneFromStack(db, item.item_id);
    const updated = await loadItem(db, item.item_id);
    expect(updated.quantity).toBe(2);
  });

  test("removeOneFromStack deletes the row when quantity is one", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 1 });
    await removeOneFromStack(db, item.item_id);
    const remaining = await db.query.itemsTable.findMany();
    expect(remaining).toHaveLength(0);
  });

  test("removeOneFromStack is a no-op for a missing item", async () => {
    await removeOneFromStack(db, 999);
    expect(await db.query.itemsTable.findMany()).toHaveLength(0);
  });

  test("splitItemStack copies identical fields to the destination", async () => {
    const item = await insertItem(db, storageId, characterId, {
      quantity: 5,
      weight: 1.5,
    });
    const destination = await insertStorage(db, characterId, "Satchel");
    await splitItemStack(db, item.item_id, 2, destination.storage_location_id);

    const original = await loadItem(db, item.item_id);
    expect(original.quantity).toBe(3);
    expect(original.storage_location_id).toBe(storageId);

    const moved = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.storage_location_id, destination.storage_location_id),
    });
    expect(moved?.name).toBe("Rope of Climbing");
    expect(moved?.description).toBe(null);
    expect(moved?.item_type).toBe("consumable");
    expect(moved?.weight).toBe(1.5);
    expect(moved?.rarity).toBe("Uncommon");
    expect(moved?.character_id).toBe(characterId);
    expect(moved?.quantity).toBe(2);
  });

  test("splitItemStack rejects moving the whole stack", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    const destination = await insertStorage(db, characterId, "Satchel");
    await expect(
      splitItemStack(db, item.item_id, 3, destination.storage_location_id),
    ).rejects.toThrow("less than the stack quantity");
    const items = await db.query.itemsTable.findMany();
    expect(items).toHaveLength(1);
  });

  test("splitItemStack rejects a zero amount", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    const destination = await insertStorage(db, characterId, "Satchel");
    await expect(
      splitItemStack(db, item.item_id, 0, destination.storage_location_id),
    ).rejects.toThrow("at least 1");
  });

  test("splitItemStack rejects a container owned by another character", async () => {
    const other = await insertCharacter(db, "QA Second");
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    const foreignStorage = await insertStorage(db, other.character_id, "Foreign Bag");
    await expect(
      splitItemStack(db, item.item_id, 1, foreignStorage.storage_location_id),
    ).rejects.toThrow("another character");
  });

  test("splitItemStack rejects the current container", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    await expect(
      splitItemStack(db, item.item_id, 1, storageId),
    ).rejects.toThrow("current container");
  });

  test("splitItemStack writes no ledger rows", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    const destination = await insertStorage(db, characterId, "Satchel");
    await splitItemStack(db, item.item_id, 1, destination.storage_location_id);
    expect(await db.query.ledgerTable.findMany()).toHaveLength(0);
  });

  test("moveItemToContainer repicks the container within the character", async () => {
    const item = await insertItem(db, storageId, characterId);
    const destination = await insertStorage(db, characterId, "Satchel");
    await moveItemToContainer(db, item.item_id, destination.storage_location_id);
    const moved = await loadItem(db, item.item_id);
    expect(moved.storage_location_id).toBe(destination.storage_location_id);
    expect(moved.character_id).toBe(characterId);
  });

  test("moveItemToContainer is a no-op for the current container", async () => {
    const item = await insertItem(db, storageId, characterId);
    await moveItemToContainer(db, item.item_id, storageId);
    const moved = await loadItem(db, item.item_id);
    expect(moved.storage_location_id).toBe(storageId);
  });

  test("moveItemToContainer rejects a container owned by another character", async () => {
    const other = await insertCharacter(db, "QA Second");
    const item = await insertItem(db, storageId, characterId);
    const foreignStorage = await insertStorage(db, other.character_id, "Foreign Bag");
    await expect(
      moveItemToContainer(db, item.item_id, foreignStorage.storage_location_id),
    ).rejects.toThrow("another character");
  });

  test("findOrCreateOnPersonStorage creates the container with carrying defaults", async () => {
    const onPerson = await findOrCreateOnPersonStorage(db, characterId);
    expect(onPerson.name).toBe(ON_PERSON_NAME);
    expect(onPerson.character_id).toBe(characterId);
    expect(onPerson.carrying).toBe(true);
    expect(onPerson.is_fixed_weight).toBe(true);
    expect(onPerson.weight).toBe(0);
  });

  test("findOrCreateOnPersonStorage reuses an existing On Person container", async () => {
    const created = await findOrCreateOnPersonStorage(db, characterId);
    const found = await findOrCreateOnPersonStorage(db, characterId);
    expect(found.storage_location_id).toBe(created.storage_location_id);
    const storages = await db.query.storageLocationsTable.findMany({
      where: eq(storageLocationsTable.character_id, characterId),
    });
    expect(storages).toHaveLength(2);
  });

  test("transferItemToCharacter lands the stack in the target's On Person container", async () => {
    const target = await insertCharacter(db, "QA Second");
    const item = await insertItem(db, storageId, characterId, { quantity: 2 });
    await transferItemToCharacter(db, item.item_id, target.character_id);

    const moved = await loadItem(db, item.item_id);
    expect(moved.character_id).toBe(target.character_id);
    expect(moved.quantity).toBe(2);

    const onPerson = await db.query.storageLocationsTable.findFirst({
      where: eq(storageLocationsTable.character_id, target.character_id),
    });
    expect(onPerson?.name).toBe(ON_PERSON_NAME);
    expect(onPerson?.carrying).toBe(true);
    expect(onPerson?.is_fixed_weight).toBe(true);
    expect(moved.storage_location_id).toBe(onPerson?.storage_location_id);
  });

  test("transferItemToCharacter writes a ledger row for each side", async () => {
    const target = await insertCharacter(db, "QA Second");
    const item = await insertItem(db, storageId, characterId, { quantity: 2 });
    await transferItemToCharacter(db, item.item_id, target.character_id);

    const rows = await db.query.ledgerTable.findMany();
    expect(rows).toHaveLength(2);
    const sourceRow = rows.find((row) => row.character_id === characterId);
    const targetRow = rows.find((row) => row.character_id === target.character_id);
    expect(sourceRow?.message).toBe(
      "Transferred Rope of Climbing x2 to QA Second",
    );
    expect(targetRow?.message).toBe(
      "Received Rope of Climbing x2 from QA Hero",
    );
  });

  test("transferItemToCharacter reuses an existing On Person container", async () => {
    const target = await insertCharacter(db, "QA Second");
    const existing = await insertStorage(db, target.character_id, ON_PERSON_NAME);
    const item = await insertItem(db, storageId, characterId);
    await transferItemToCharacter(db, item.item_id, target.character_id);

    const moved = await loadItem(db, item.item_id);
    expect(moved.storage_location_id).toBe(existing.storage_location_id);
    const targetStorages = await db.query.storageLocationsTable.findMany({
      where: eq(storageLocationsTable.character_id, target.character_id),
    });
    expect(targetStorages).toHaveLength(1);
  });

  test("transferItemToCharacter to the same character is a no-op", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 2 });
    await transferItemToCharacter(db, item.item_id, characterId);

    const unchanged = await loadItem(db, item.item_id);
    expect(unchanged.character_id).toBe(characterId);
    expect(unchanged.storage_location_id).toBe(storageId);
    expect(await db.query.ledgerTable.findMany()).toHaveLength(0);
    const storages = await db.query.storageLocationsTable.findMany({
      where: eq(storageLocationsTable.character_id, characterId),
    });
    expect(storages).toHaveLength(1);
  });

  test("same-character moves and deletes write no ledger rows", async () => {
    const item = await insertItem(db, storageId, characterId, { quantity: 3 });
    const destination = await insertStorage(db, characterId, "Satchel");
    await moveItemToContainer(db, item.item_id, destination.storage_location_id);
    await removeOneFromStack(db, item.item_id);
    await deleteItemRow(db, item.item_id);
    expect(await db.query.ledgerTable.findMany()).toHaveLength(0);
  });
});
