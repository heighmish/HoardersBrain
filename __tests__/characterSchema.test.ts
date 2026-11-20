import { charactersTable } from "@/db/schema";
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

describe("characters.weight_tracking migration", () => {
  let db: TestDatabase;

  beforeEach(() => {
    db = createTestDb();
  });

  test("column defaults to true on a fresh createTestDb replay", async () => {
    const character = await insertCharacter(db, "QA Hero");
    expect(character.weight_tracking).toBe(true);
  });

  test("an explicit opt-out persists", async () => {
    const inserted = await db
      .insert(charactersTable)
      .values({ name: "QA Hero", weight_tracking: false })
      .returning();
    const created = inserted[0];
    if (created === undefined) {
      throw new Error("character insert failed");
    }

    const found = await db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, created.character_id),
    });
    expect(found?.weight_tracking).toBe(false);
  });

  test("an update round-trips the boolean", async () => {
    const character = await insertCharacter(db, "QA Hero");
    await db
      .update(charactersTable)
      .set({ weight_tracking: false })
      .where(eq(charactersTable.character_id, character.character_id));

    const found = await db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, character.character_id),
    });
    expect(found?.weight_tracking).toBe(false);
  });
});
