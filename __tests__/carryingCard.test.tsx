import Carrying from "@/components/Carrying";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import { ThemeProvider } from "@/stores/ThemeContext";
import { createTestDb, TestDatabase } from "@/testing/db";
import { act, render, screen } from "@testing-library/react-native";

const mockDb: { current?: TestDatabase } = {};

jest.mock("@/db/DatabaseProvider", () => ({
  useDatabase: () => mockDb.current,
}));

jest.mock("expo-sqlite", () => ({
  addDatabaseChangeListener: () => ({ remove: () => {} }),
}));

const currentDb = (): TestDatabase => {
  const db = mockDb.current;
  if (db === undefined) {
    throw new Error("test db is not initialized");
  }
  return db;
};

const seedCharacter = async (weightTracking: boolean) => {
  const db = currentDb();
  const insertedCharacter = await db
    .insert(charactersTable)
    .values({ name: "QA Hero", weight_tracking: weightTracking })
    .returning();
  const character = insertedCharacter[0];
  if (character === undefined) {
    throw new Error("character insert failed");
  }

  const insertedStorage = await db
    .insert(storageLocationsTable)
    .values({
      character_id: character.character_id,
      name: "Backpack",
      weight: 2,
      carrying: true,
      is_fixed_weight: false,
    })
    .returning();
  const storage = insertedStorage[0];
  if (storage === undefined) {
    throw new Error("storage insert failed");
  }

  await db.insert(itemsTable).values({
    storage_location_id: storage.storage_location_id,
    character_id: character.character_id,
    name: "Rope of Climbing",
    item_type: "consumable",
    weight: 1.5,
    rarity: "Common",
    quantity: 1,
  });

  return character;
};

const flushQueries = async () => {
  await act(async () => {
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe("Carrying card visibility", () => {
  beforeEach(() => {
    mockDb.current = createTestDb();
  });

  test("renders the card with carried weight when weight tracking is on", async () => {
    const character = await seedCharacter(true);
    await render(
      <ThemeProvider>
        <Carrying characterId={character.character_id} />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId("encumbrance-card")).toBeTruthy();
    expect(screen.getByText(/Carrying: 3\.5\/100/)).toBeTruthy();
  });

  test("renders nothing when weight tracking is off", async () => {
    const character = await seedCharacter(false);
    await render(
      <ThemeProvider>
        <Carrying characterId={character.character_id} />
      </ThemeProvider>,
    );

    await flushQueries();
    expect(screen.queryByTestId("encumbrance-card")).toBeNull();
  });
});
