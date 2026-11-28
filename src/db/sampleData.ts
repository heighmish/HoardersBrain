import type { Rarity } from "@/constants/databaseTypes";
import type { AppDatabase } from "@/db/DatabaseProvider";
import { DEFAULT_CONTAINER_NAME } from "@/db/repositories/containers";
import {
  clearEnsuredTagsCache,
  seedDefaultTagsInTransaction,
  setItemTagsInTransaction,
} from "@/db/repositories/tags";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
  tagsTable,
} from "@/db/schema";
import type { CoinDenomination } from "@/utils/currency";
import { eq } from "drizzle-orm";

const SAMPLE_CHARACTER_NAME = "Sample Character";
const SAMPLE_POUCH_NAME = "Pouch";
const SAMPLE_BAG_NAME = "Bag of Holding";
const SAMPLE_CHEST_NAME = "Camp Chest";

type SampleContainerKey = "equipped" | "pouch" | "bag" | "chest";

type SampleItem = {
  name: string;
  description?: string;
  weight: number;
  quantity: number;
  rarity?: Rarity;
  value?: number;
  value_currency?: CoinDenomination;
  container: SampleContainerKey;
  tags: readonly string[];
};

const CONTAINER_NAME_BY_KEY: Record<SampleContainerKey, string> = {
  equipped: DEFAULT_CONTAINER_NAME,
  pouch: SAMPLE_POUCH_NAME,
  bag: SAMPLE_BAG_NAME,
  chest: SAMPLE_CHEST_NAME,
};

// Placeholder weights & values, not rules data: enough for column layout,
// encumbrance math, tags, rarity dots, and quick-use testing.
const SAMPLE_ITEMS: SampleItem[] = [
  // Equipped (6)
  {
    name: "Breastplate",
    weight: 20,
    quantity: 1,
    value: 400,
    value_currency: "gp",
    container: "equipped",
    tags: ["Armor"],
  },
  {
    name: "Greatsword",
    weight: 6,
    quantity: 1,
    value: 50,
    value_currency: "gp",
    container: "equipped",
    tags: ["Weapon"],
  },
  {
    name: "Longbow",
    weight: 2,
    quantity: 1,
    value: 50,
    value_currency: "gp",
    container: "equipped",
    tags: ["Weapon"],
  },
  {
    name: "Arrows",
    weight: 0.05,
    quantity: 20,
    value: 1,
    value_currency: "gp",
    container: "equipped",
    tags: ["Ammunition"],
  },
  {
    name: "Cloak of Protection",
    weight: 1,
    quantity: 1,
    rarity: "Uncommon",
    value: 500,
    value_currency: "gp",
    container: "equipped",
    tags: ["Armor", "Magic"],
  },
  {
    name: "Signet Ring",
    weight: 0,
    quantity: 1,
    value: 5,
    value_currency: "gp",
    container: "equipped",
    tags: ["Misc"],
  },

  // Pouch (6)
  {
    name: "Potion of Cure Light Wounds",
    weight: 0.5,
    quantity: 3,
    rarity: "Uncommon",
    value: 50,
    value_currency: "gp",
    container: "pouch",
    tags: ["Potion", "Magic"],
  },
  {
    name: "Scroll of Flaming Hands",
    weight: 0.1,
    quantity: 2,
    rarity: "Uncommon",
    value: 75,
    value_currency: "gp",
    container: "pouch",
    tags: ["Scroll", "Magic"],
  },
  {
    name: "Antitoxin Vial",
    weight: 0.2,
    quantity: 2,
    value: 50,
    value_currency: "gp",
    container: "pouch",
    tags: ["Potion"],
  },
  {
    name: "Thieves' Tools",
    weight: 1,
    quantity: 1,
    value: 25,
    value_currency: "gp",
    container: "pouch",
    tags: ["Tool"],
  },
  {
    name: "Tinderbox",
    weight: 1,
    quantity: 1,
    value: 5,
    value_currency: "sp",
    container: "pouch",
    tags: ["Tool"],
  },
  {
    name: "Chalk",
    weight: 0,
    quantity: 5,
    value: 1,
    value_currency: "cp",
    container: "pouch",
    tags: ["Misc"],
  },

  // Bag of Holding (8)
  {
    name: "Rations (1 day)",
    weight: 2,
    quantity: 7,
    value: 5,
    value_currency: "sp",
    container: "bag",
    tags: ["Food & Drink"],
  },
  {
    name: "Waterskin",
    weight: 5,
    quantity: 2,
    value: 2,
    value_currency: "sp",
    container: "bag",
    tags: ["Food & Drink"],
  },
  {
    name: "Rope of Climbing",
    weight: 3,
    quantity: 1,
    rarity: "Uncommon",
    value: 200,
    value_currency: "gp",
    container: "bag",
    tags: ["Magic", "Tool"],
  },
  {
    name: "Torch",
    weight: 1,
    quantity: 8,
    value: 1,
    value_currency: "cp",
    container: "bag",
    tags: ["Consumable", "Tool"],
  },
  {
    name: "Potion of Greater Healing",
    weight: 0.5,
    quantity: 2,
    rarity: "Rare",
    value: 150,
    value_currency: "gp",
    container: "bag",
    tags: ["Potion", "Magic"],
  },
  {
    name: "Scroll of Feather Fall",
    weight: 0.1,
    quantity: 1,
    rarity: "Uncommon",
    value: 60,
    value_currency: "gp",
    container: "bag",
    tags: ["Scroll", "Magic"],
  },
  {
    name: "Ruby Gemstone",
    weight: 0.1,
    quantity: 3,
    rarity: "Rare",
    value: 250,
    value_currency: "gp",
    container: "bag",
    tags: ["Treasure"],
  },
  {
    name: "Crowbar",
    weight: 5,
    quantity: 1,
    value: 2,
    value_currency: "gp",
    container: "bag",
    tags: ["Tool"],
  },

  // Camp Chest (6 — stowed)
  {
    name: "Two-Person Tent",
    weight: 20,
    quantity: 1,
    value: 2,
    value_currency: "gp",
    container: "chest",
    tags: ["Misc"],
  },
  {
    name: "Bedroll",
    weight: 7,
    quantity: 1,
    value: 1,
    value_currency: "gp",
    container: "chest",
    tags: ["Misc"],
  },
  {
    name: "Chain Mail (Spare)",
    weight: 55,
    quantity: 1,
    value: 75,
    value_currency: "gp",
    container: "chest",
    tags: ["Armor"],
  },
  {
    name: "Silver Trade Bar",
    weight: 1,
    quantity: 4,
    value: 5,
    value_currency: "gp",
    container: "chest",
    tags: ["Treasure"],
  },
  {
    name: "Sun Blade Hilt",
    weight: 1,
    quantity: 1,
    rarity: "Very Rare",
    container: "chest",
    tags: ["Weapon", "Magic"],
  },
  {
    name: "Silvered Arrows",
    weight: 0.05,
    quantity: 12,
    rarity: "Uncommon",
    value: 10,
    value_currency: "gp",
    container: "chest",
    tags: ["Ammunition"],
  },
];

export type SampleDataResult = {
  id: number;
  name: string;
  status: "created" | "reloaded";
};

/**
 * Ensures exactly one live sample character with its containers and items.
 * Reloading reuses the character row and replaces its contents, so repeated
 * runs do not pile up fixtures.
 */
export const loadSampleData = async (
  db: AppDatabase,
): Promise<SampleDataResult> =>
  db.transaction((tx) => {
    const existing = tx
      .select()
      .from(charactersTable)
      .where(eq(charactersTable.name, SAMPLE_CHARACTER_NAME))
      .get();

    const characterId = (() => {
      if (existing === undefined) {
        const created = tx
          .insert(charactersTable)
          .values({
            name: SAMPLE_CHARACTER_NAME,
            copper: 15,
            silver: 40,
            gold: 125,
            platinum: 2,
          })
          .returning()
          .get();
        return created.character_id;
      }

      tx.update(itemsTable)
        .set({ deleted_at: new Date() })
        .where(eq(itemsTable.character_id, existing.character_id))
        .run();
      tx.update(storageLocationsTable)
        .set({ deleted_at: new Date() })
        .where(eq(storageLocationsTable.character_id, existing.character_id))
        .run();
      tx.update(tagsTable)
        .set({ deleted_at: new Date() })
        .where(eq(tagsTable.character_id, existing.character_id))
        .run();
      clearEnsuredTagsCache(existing.character_id);
      tx.update(charactersTable)
        .set({
          deleted_at: null,
          copper: 15,
          silver: 40,
          gold: 125,
          platinum: 2,
          max_encumbrance: 100,
          weight_tracking: true,
        })
        .where(eq(charactersTable.character_id, existing.character_id))
        .run();
      return existing.character_id;
    })();

    const insertedContainers = tx
      .insert(storageLocationsTable)
      .values([
        {
          character_id: characterId,
          name: DEFAULT_CONTAINER_NAME,
          description: null,
          weight: 0,
          is_fixed_weight: false,
          carrying: true,
          rarity: "Common",
          properties: null,
        },
        {
          character_id: characterId,
          name: SAMPLE_POUCH_NAME,
          description: null,
          weight: 1,
          is_fixed_weight: false,
          carrying: true,
          rarity: "Common",
          properties: null,
        },
        {
          character_id: characterId,
          name: SAMPLE_BAG_NAME,
          description: "Extradimensional space",
          weight: 15,
          is_fixed_weight: true,
          carrying: true,
          rarity: "Uncommon",
          properties: null,
        },
        {
          character_id: characterId,
          name: SAMPLE_CHEST_NAME,
          description: "Left at camp",
          weight: 25,
          is_fixed_weight: false,
          carrying: false,
          rarity: "Common",
          properties: null,
        },
      ])
      .returning()
      .all();

    const containerId = (name: string): number => {
      const found = insertedContainers.find(
        (container) => container.name === name,
      );
      if (found === undefined) {
        throw new Error(`Sample container insert failed: ${name}`);
      }
      return found.storage_location_id;
    };

    const tagIdByName = seedDefaultTagsInTransaction(tx, characterId);

    for (const item of SAMPLE_ITEMS) {
      const createdItem = tx
        .insert(itemsTable)
        .values({
          character_id: characterId,
          storage_location_id: containerId(
            CONTAINER_NAME_BY_KEY[item.container],
          ),
          name: item.name,
          description: item.description ?? null,
          weight: item.weight,
          quantity: item.quantity,
          rarity: item.rarity ?? "Common",
          value: item.value ?? null,
          value_currency: item.value_currency ?? null,
        })
        .returning()
        .get();

      const tagIds = item.tags.flatMap((name) => {
        const id = tagIdByName.get(name);
        return id === undefined ? [] : [id];
      });
      if (tagIds.length > 0) {
        setItemTagsInTransaction(tx, createdItem.item_id, tagIds);
      }
    }

    return {
      id: characterId,
      name: SAMPLE_CHARACTER_NAME,
      status: existing === undefined ? "created" : "reloaded",
    };
  });
