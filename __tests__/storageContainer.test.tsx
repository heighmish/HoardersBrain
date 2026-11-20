import StorageContainer from "@/components/StorageContainer";
import { Item, itemsTable, Storage, storageLocationsTable, charactersTable } from "@/db/schema";
import { THEME_SETTINGS } from "@/constants/CacheKeys";
import { createTestDb, TestDatabase } from "@/testing/db";
import { ThemeProvider } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { StyleSheet } from "react-native";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
  },
}));

const mockItems: { current: Item[] } = { current: [] };

jest.mock("drizzle-orm/expo-sqlite", () => ({
  useLiveQuery: () => ({ data: mockItems.current }),
}));

const mockDb: { current?: TestDatabase } = {};

jest.mock("@/db/DatabaseProvider", () => ({
  useDatabase: () => mockDb.current,
}));

const mockRouter = jest.mocked(router);

let storedSettings: string | null = null;

beforeEach(() => {
  mockDb.current = createTestDb();
  mockItems.current = [];
  mockRouter.push.mockClear();
  storedSettings = null;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) =>
      key === THEME_SETTINGS ? storedSettings : null,
  );
});

afterEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
});

const storedTheme = (settings: Record<string, unknown>) => {
  storedSettings = JSON.stringify(settings);
};

const insertCharacter = async (db: TestDatabase) => {
  const inserted = await db.insert(charactersTable).values({ name: "QA Hero" }).returning();
  const character = inserted[0];
  if (character === undefined) {
    throw new Error("character insert failed");
  }
  return character;
};

const insertStorage = async (
  db: TestDatabase,
  characterId: number,
  values: { name: string; carrying?: boolean; is_fixed_weight?: boolean },
) => {
  const inserted = await db
    .insert(storageLocationsTable)
    .values({
      character_id: characterId,
      name: values.name,
      weight: 0,
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
) => {
  const inserted = await db
    .insert(itemsTable)
    .values({
      character_id: characterId,
      storage_location_id: storageId,
      name: "Rope of Climbing",
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

const renderCard = async (storage: Storage) => {
  await render(
    <ThemeProvider>
      <StorageContainer storage={storage} />
    </ThemeProvider>,
  );
};

describe("StorageContainer delete affordance", () => {
  test("shows edit and delete buttons for a regular container", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    await renderCard(bag);

    expect(
      await screen.findByTestId(`edit-storage-button-${bag.storage_location_id}`),
    ).toBeTruthy();
    expect(
      screen.getByTestId(`delete-storage-button-${bag.storage_location_id}`),
    ).toBeTruthy();
    expect(screen.getByText("Storing: 0lbs")).toBeTruthy();
  });

  test("the edit button routes to the edit form with the storage id", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    await renderCard(bag);
    await fireEvent.press(
      await screen.findByTestId(`edit-storage-button-${bag.storage_location_id}`),
    );

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/CreateStorageForm",
      params: { storageId: bag.storage_location_id },
    });
  });

  test("an empty container asks for confirmation and deletes on confirm", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    await renderCard(bag);
    await fireEvent.press(
      await screen.findByTestId(`delete-storage-button-${bag.storage_location_id}`),
    );

    expect(await screen.findByText("Delete container?")).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId(`confirm-delete-storage-${bag.storage_location_id}`),
    );

    const remaining = await db.query.storageLocationsTable.findMany();
    expect(remaining).toHaveLength(0);
    expect(screen.queryByTestId(`confirm-delete-storage-${bag.storage_location_id}`)).toBeNull();
  });

  test("a container with items states the On Person move and moves them on confirm", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });
    const item = await insertItem(db, character.character_id, bag.storage_location_id);
    mockItems.current = [item];

    await renderCard(bag);
    await fireEvent.press(
      await screen.findByTestId(`delete-storage-button-${bag.storage_location_id}`),
    );

    expect(await screen.findByText("Items move to On Person.")).toBeTruthy();

    await fireEvent.press(
      screen.getByTestId(`confirm-delete-storage-${bag.storage_location_id}`),
    );

    const movedItem = await db.query.itemsTable.findFirst();
    expect(movedItem?.name).toBe("Rope of Climbing");
    const onPerson = await db.query.storageLocationsTable.findMany();
    expect(onPerson).toHaveLength(1);
    expect(onPerson[0]?.name).toBe("On Person");
    expect(onPerson[0]?.storage_location_id).toBe(movedItem?.storage_location_id);
  });

  test("cancel closes the confirmation and keeps the row", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    await renderCard(bag);
    await fireEvent.press(
      await screen.findByTestId(`delete-storage-button-${bag.storage_location_id}`),
    );
    await fireEvent.press(
      await screen.findByTestId(`cancel-delete-storage-${bag.storage_location_id}`),
    );

    expect(
      screen.queryByText("Delete container?"),
    ).toBeNull();
    expect(
      screen.getByText("Storing: 0lbs"),
    ).toBeTruthy();
    const rows = await db.query.storageLocationsTable.findMany();
    expect(rows).toHaveLength(1);
  });

  test("the On Person container has no delete button and explains why", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const onPerson = await insertStorage(db, character.character_id, {
      name: "On Person",
      carrying: true,
      is_fixed_weight: true,
    });

    await renderCard(onPerson);

    expect(
      await screen.findByTestId(`edit-storage-button-${onPerson.storage_location_id}`),
    ).toBeTruthy();
    expect(
      screen.queryByTestId(`delete-storage-button-${onPerson.storage_location_id}`),
    ).toBeNull();
    expect(screen.getByText("Cannot be deleted")).toBeTruthy();
  });

  test("renders without token crashes in dark mode", async () => {
    storedTheme({ presetId: "mind-flayer", mode: "dark", customPalettes: [] });
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    await renderCard(bag);

    const nameText = await screen.findByText(/Bag of Holding/);
    expect(StyleSheet.flatten(nameText.props.style).color).toBe("#F8F8F2");
  });

  test("follows a resolved light mode for the name text", async () => {
    storedTheme({ presetId: "mind-flayer", mode: "light", customPalettes: [] });
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await insertCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
    });

    await renderCard(bag);

    const nameText = await screen.findByText(/Bag of Holding/);
    expect(StyleSheet.flatten(nameText.props.style).color).toBe("#282A36");
  });
});
