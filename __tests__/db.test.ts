import {
  charactersTable,
  itemsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import { createTestDb, TestDatabase } from "@/testing/db";
import { eq } from "drizzle-orm";

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
  name: string,
) => {
  const inserted = await db
    .insert(storageLocationsTable)
    .values({ character_id: characterId, name, weight: 0 })
    .returning();
  const storage = inserted[0];
  if (storage === undefined) {
    throw new Error("storage insert failed");
  }
  return storage;
};

describe("database harness", () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  test("migrations apply and a character round-trips", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const found = await db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, character.character_id),
    });
    expect(found?.name).toBe("QA Hero");
    expect(found?.max_encumbrance).toBe(100);
  });

  test("items insert and load through the relational query api", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const storage = await insertStorage(db, character.character_id, "Backpack");
    const inserted = await db
      .insert(itemsTable)
      .values({
        storage_location_id: storage.storage_location_id,
        character_id: character.character_id,
        name: "Rope of Climbing",
        item_type: "consumable",
        weight: 1.5,
        rarity: "Uncommon",
        quantity: 1,
      })
      .returning();
    expect(inserted[0]?.item_type).toBe("consumable");
    const items = await db.query.itemsTable.findMany();
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Rope of Climbing");
  });

  test("foreign keys are enforced", async () => {
    const character = await insertCharacter(db, "QA Hero");
    await expect(
      db.insert(itemsTable).values({
        storage_location_id: character.character_id + 999,
        character_id: character.character_id,
        name: "Ghost Item",
        item_type: "consumable",
        weight: 1,
        rarity: "Common",
      }),
    ).rejects.toThrow();
  });

  test("negative weight violates the check constraint", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const storage = await insertStorage(db, character.character_id, "Bag");
    await expect(
      db.insert(itemsTable).values({
        storage_location_id: storage.storage_location_id,
        character_id: character.character_id,
        name: "Feather",
        item_type: "consumable",
        weight: -1,
        rarity: "Common",
      }),
    ).rejects.toThrow();
  });

  test("invalid rarity violates the check constraint", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const storage = await insertStorage(db, character.character_id, "Bag");
    await expect(
      db.insert(itemsTable).values({
        storage_location_id: storage.storage_location_id,
        character_id: character.character_id,
        name: "Cursed Sword",
        item_type: "weapon",
        weight: 3,
        rarity: "Mythic" as never,
      }),
    ).rejects.toThrow();
  });

  test("ledger accepts entries for a character", async () => {
    const character = await insertCharacter(db, "QA Hero");
    const inserted = await db
      .insert(ledgerTable)
      .values({
        message: "Gained 50 gold from the ogre cave",
        character_id: character.character_id,
      })
      .returning();
    expect(inserted[0]?.message).toBe("Gained 50 gold from the ogre cave");
  });
});
