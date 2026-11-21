import { ON_PERSON_NAME, type ItemFlowDb } from "@/components/itemOperations";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export const SAMPLE_CHARACTER_NAME = "Sample Character";
export const SAMPLE_POUCH_NAME = "Pouch";

type SampleItem = {
  name: string;
  item_type: string;
  weight: number;
  quantity: number;
  container: "carrying" | "pouch";
};

// Placeholder weights, not rules data: enough for the weight column and
// encumbrance math to have something to sum.
const SAMPLE_ITEMS: SampleItem[] = [
  { name: "Breastplate", item_type: "armor", weight: 20, quantity: 1, container: "carrying" },
  { name: "Greatsword", item_type: "weapon", weight: 6, quantity: 1, container: "carrying" },
  {
    name: "Potion of Cure Light Wounds",
    item_type: "consumable",
    weight: 0.5,
    quantity: 2,
    container: "pouch",
  },
  {
    name: "Scroll of Flaming Hands",
    item_type: "consumable",
    weight: 0.1,
    quantity: 1,
    container: "pouch",
  },
];

export type SampleDataResult = "created" | "reloaded";

/**
 * Ensures exactly one live sample character with its containers and items.
 * Reloading reuses the character row and replaces its contents, so repeated
 * runs do not pile up fixtures.
 */
export const loadSampleData = async (
  db: ItemFlowDb,
): Promise<SampleDataResult> => {
  const existing = await db.query.charactersTable.findFirst({
    where: eq(charactersTable.name, SAMPLE_CHARACTER_NAME),
  });

  const characterId = await (async () => {
    if (existing === undefined) {
      const inserted = await db
        .insert(charactersTable)
        .values({ name: SAMPLE_CHARACTER_NAME })
        .returning();
      const created = inserted[0];
      if (created === undefined) {
        throw new Error("Sample character insert failed");
      }
      return created.character_id;
    }

    await db
      .update(itemsTable)
      .set({ deleted_at: new Date() })
      .where(eq(itemsTable.character_id, existing.character_id));
    await db
      .update(storageLocationsTable)
      .set({ deleted_at: new Date() })
      .where(eq(storageLocationsTable.character_id, existing.character_id));
    await db
      .update(charactersTable)
      .set({
        deleted_at: null,
        copper: 0,
        silver: 0,
        gold: 0,
        platinum: 0,
        max_encumbrance: 100,
        weight_tracking: true,
      })
      .where(eq(charactersTable.character_id, existing.character_id));
    return existing.character_id;
  })();

  const insertedContainers = await db
    .insert(storageLocationsTable)
    .values([
      {
        character_id: characterId,
        name: ON_PERSON_NAME,
        weight: 0,
        carrying: true,
        is_fixed_weight: false,
      },
      {
        character_id: characterId,
        name: SAMPLE_POUCH_NAME,
        weight: 0,
        carrying: false,
      },
    ])
    .returning();

  const containerId = (name: string): number => {
    const found = insertedContainers.find(
      (container) => container.name === name,
    );
    if (found === undefined) {
      throw new Error(`Sample container insert failed: ${name}`);
    }
    return found.storage_location_id;
  };

  await db.insert(itemsTable).values(
    SAMPLE_ITEMS.map((item) => ({
      character_id: characterId,
      storage_location_id: containerId(
        item.container === "carrying" ? ON_PERSON_NAME : SAMPLE_POUCH_NAME,
      ),
      name: item.name,
      item_type: item.item_type,
      weight: item.weight,
      quantity: item.quantity,
    })),
  );

  return existing === undefined ? "created" : "reloaded";
};

