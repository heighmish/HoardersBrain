import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import {
  deleteStorageContainer,
  ON_PERSON_STORAGE_NAME,
  updateStorageContainer,
} from "@/components/storageLifecycle";
import { createTestDb, TestDatabase } from "@/testing/db";
import { and, eq } from "drizzle-orm";

const insertCharacter = async (db: TestDatabase, name: string) => {
  const inserted = await db
    .insert(charactersTable)
    .values({ name })
    .returning();
  const character = inserted[0];
  if (character === undefined) {
    throw new Error("character insert failed");
  }
  return character;
};

const insertStorage = async (
  db: TestDatabase,
  characterId: number,
  values: {
    name: string;
    weight?: number;
    carrying?: boolean;
    is_fixed_weight?: boolean;
  },
) => {
  const inserted = await db
    .insert(storageLocationsTable)
    .values({
      character_id: characterId,
      name: values.name,
      weight: values.weight ?? 0,
      carrying: values.carrying ?? false,
      is_fixed_weight: values.is_fixed_weight ?? false,
    })
    .returning();
  const storage = inserted[0];
  if (storage === undefined) {
    throw new Error("storage insert failed");
  }
  return storage;
};

const insertItem = async (
  db: TestDatabase,
  characterId: number,
  storageId: number,
  name: string,
) => {
  const inserted = await db
    .insert(itemsTable)
    .values({
      character_id: characterId,
      storage_location_id: storageId,
      name,
      item_type: "consumable",
      weight: 1,
      rarity: "Common",
    })
    .returning();
  const item = inserted[0];
  if (item === undefined) {
    throw new Error("item insert failed");
  }
  return item;
};

const findOnPerson = async (db: TestDatabase, characterId: number) =>
  db.query.storageLocationsTable.findFirst({
    where: and(
      eq(storageLocationsTable.character_id, characterId),
      eq(storageLocationsTable.name, ON_PERSON_STORAGE_NAME),
    ),
  });

describe("container lifecycle", () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  test("deleting an empty container removes the row and creates no On Person container", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    const result = deleteStorageContainer(db, bag);

    expect(result).toEqual({ status: "deleted" });
    const rows = await db.query.storageLocationsTable.findMany({
      where: eq(storageLocationsTable.character_id, character.character_id),
    });
    expect(rows).toHaveLength(0);
  });

  test("deleting a non-empty container moves items to the existing On Person container", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const onPerson = await insertStorage(db, character.character_id, {
      name: ON_PERSON_STORAGE_NAME,
      carrying: true,
      is_fixed_weight: true,
    });
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });
    await insertItem(db, character.character_id, bag.storage_location_id, "Rope of Climbing");

    const result = deleteStorageContainer(db, bag);

    expect(result).toEqual({ status: "deleted" });
    const movedItem = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.name, "Rope of Climbing"),
    });
    expect(movedItem?.storage_location_id).toBe(onPerson.storage_location_id);
    const onPersonRows = await db.query.storageLocationsTable.findMany({
      where: eq(storageLocationsTable.name, ON_PERSON_STORAGE_NAME),
    });
    expect(onPersonRows).toHaveLength(1);
    const bagRow = await db.query.storageLocationsTable.findFirst({
      where: eq(storageLocationsTable.storage_location_id, bag.storage_location_id),
    });
    expect(bagRow).toBeUndefined();
  });

  test("deleting a non-empty container auto-creates On Person when missing and moves items there", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });
    await insertItem(db, character.character_id, bag.storage_location_id, "Rope of Climbing");

    const result = deleteStorageContainer(db, bag);

    expect(result).toEqual({ status: "deleted" });
    const onPerson = await findOnPerson(db, character.character_id);
    expect(onPerson).toBeDefined();
    expect(onPerson?.carrying).toBe(true);
    expect(onPerson?.weight).toBe(0);
    expect(onPerson?.is_fixed_weight).toBe(true);
    const movedItem = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.name, "Rope of Climbing"),
    });
    expect(movedItem?.storage_location_id).toBe(onPerson?.storage_location_id);
  });

  test("the On Person container is not deletable", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const onPerson = await insertStorage(db, character.character_id, {
      name: ON_PERSON_STORAGE_NAME,
      carrying: true,
      is_fixed_weight: true,
    });
    await insertItem(db, character.character_id, onPerson.storage_location_id, "Rope of Climbing");

    const result = deleteStorageContainer(db, onPerson);

    expect(result).toEqual({ status: "onPersonProtected" });
    const survivingRow = await db.query.storageLocationsTable.findFirst({
      where: eq(storageLocationsTable.storage_location_id, onPerson.storage_location_id),
    });
    expect(survivingRow?.name).toBe(ON_PERSON_STORAGE_NAME);
    const items = await db.query.itemsTable.findMany({
      where: eq(itemsTable.storage_location_id, onPerson.storage_location_id),
    });
    expect(items).toHaveLength(1);
  });

  test("items in another character's containers are untouched by a delete", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const otherCharacter = await insertCharacter(db, "QA Second");
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });
    const otherBag = await insertStorage(db, otherCharacter.character_id, {
      name: "Other Bag",
    });
    await insertItem(db, otherCharacter.character_id, otherBag.storage_location_id, "Other Rope");

    const result = deleteStorageContainer(db, bag);

    expect(result).toEqual({ status: "deleted" });
    const otherItem = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.name, "Other Rope"),
    });
    expect(otherItem?.storage_location_id).toBe(otherBag.storage_location_id);
    const otherOnPerson = await findOnPerson(db, otherCharacter.character_id);
    expect(otherOnPerson).toBeUndefined();
  });

  test("a raw delete of a non-empty container is blocked by the foreign key", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });
    await insertItem(db, character.character_id, bag.storage_location_id, "Rope of Climbing");

    expect(() =>
      db.delete(storageLocationsTable)
        .where(eq(storageLocationsTable.storage_location_id, bag.storage_location_id))
        .run(),
    ).toThrow();
  });

  test("updateStorageContainer round-trips every editable field", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    updateStorageContainer(db, bag.storage_location_id, {
      name: "Bag of Holding Two",
      description: "Extra dimensional space",
      carrying: false,
      rarity: "Rare",
      character_id: character.character_id,
      is_fixed_weight: true,
      properties: null,
      weight: 2.5,
    });

    const updated = await db.query.storageLocationsTable.findFirst({
      where: eq(storageLocationsTable.storage_location_id, bag.storage_location_id),
    });
    expect(updated?.name).toBe("Bag of Holding Two");
    expect(updated?.description).toBe("Extra dimensional space");
    expect(updated?.carrying).toBe(false);
    expect(updated?.rarity).toBe("Rare");
    expect(updated?.is_fixed_weight).toBe(true);
    expect(updated?.weight).toBe(2.5);
  });
});
