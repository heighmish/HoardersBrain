import type { AppDatabase } from "@/db/DatabaseProvider";
import { Character, charactersTable, storageLocationsTable } from "@/db/schema";
import { DEFAULT_CONTAINER_NAME } from "./containers";
import { seedDefaultTagsInTransaction } from "./tags";
import { and, asc, eq, isNull } from "drizzle-orm";

export const findActiveCharacterById = async (
  db: AppDatabase,
  characterId: number,
): Promise<Character | undefined> =>
  db.query.charactersTable.findFirst({
    where: and(
      eq(charactersTable.character_id, characterId),
      isNull(charactersTable.deleted_at),
    ),
  });

export const createCharacterWithDefaultContainer = async (
  db: AppDatabase,
  name: string,
): Promise<{ id: number; name: string }> =>
  db.transaction((tx) => {
    const created = tx
      .insert(charactersTable)
      .values({ name: name.trim() })
      .returning()
      .get();

    tx.insert(storageLocationsTable)
      .values({
        character_id: created.character_id,
        name: DEFAULT_CONTAINER_NAME,
        description: null,
        weight: 0,
        is_fixed_weight: false,
        carrying: true,
        rarity: "Common",
        properties: null,
      })
      .run();

    seedDefaultTagsInTransaction(tx, created.character_id);

    return { id: created.character_id, name: created.name };
  });

export const renameCharacter = async (
  db: AppDatabase,
  characterId: number,
  name: string,
): Promise<void> => {
  await db
    .update(charactersTable)
    .set({ name: name.trim() })
    .where(eq(charactersTable.character_id, characterId));
};

export const softDeleteCharacter = async (
  db: AppDatabase,
  characterId: number,
): Promise<Character | undefined> => {
  await db
    .update(charactersTable)
    .set({ deleted_at: new Date() })
    .where(eq(charactersTable.character_id, characterId));

  return db.query.charactersTable.findFirst({
    where: isNull(charactersTable.deleted_at),
    orderBy: asc(charactersTable.character_id),
  });
};

export const updateCharacterCurrency = async (
  db: AppDatabase,
  characterId: number,
  values: { copper: number; silver: number; gold: number; platinum: number },
): Promise<void> => {
  await db
    .update(charactersTable)
    .set(values)
    .where(eq(charactersTable.character_id, characterId));
};

export const updateCharacterSettings = async (
  db: AppDatabase,
  characterId: number,
  values: { max_encumbrance: number; weight_tracking: boolean },
): Promise<void> => {
  await db
    .update(charactersTable)
    .set(values)
    .where(eq(charactersTable.character_id, characterId));
};
