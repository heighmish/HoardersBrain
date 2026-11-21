import { THEME_SETTINGS } from "@/constants/CacheKeys";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import { ThemeProvider } from "@/stores/ThemeContext";
import { createTestDb, TestDatabase } from "@/testing/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ReactNode } from "react";
import { render } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockDb: { current?: TestDatabase } = {};

jest.mock("@/db/DatabaseProvider", () => ({
  useDatabase: () => mockDb.current,
}));

const mockParams: { current: Record<string, string> } = { current: {} };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams.current,
  router: { push: jest.fn(), back: jest.fn(), dismiss: jest.fn() },
  Stack: { Screen: () => null },
}));

jest.mock("drizzle-orm/expo-sqlite", () => {
  const React = require("react");
  const useLiveQuery = (query: unknown) => {
    const initial =
      (query as { mode?: string }).mode === "first" ? undefined : [];
    const [data, setData] = React.useState(initial);
    const [updatedAt, setUpdatedAt] = React.useState(undefined);
    const queryRef = React.useRef(query);
    React.useEffect(() => {
      let active = true;
      Promise.resolve(queryRef.current).then((resolved: unknown) => {
        if (active) {
          setData(resolved);
          setUpdatedAt(new Date());
        }
      });
      return () => {
        active = false;
      };
    }, []);
    return { data, error: undefined, updatedAt };
  };
  return { useLiveQuery };
});

let storedTheme: string | null = null;

(AsyncStorage.getItem as jest.Mock).mockImplementation(
  async (key: string) => (key === THEME_SETTINGS ? storedTheme : null),
);

export const setStoredTheme = (
  settings: Record<string, unknown> | null,
): void => {
  storedTheme = settings === null ? null : JSON.stringify(settings);
};

export const freshDb = (): TestDatabase => {
  const db = createTestDb();
  mockDb.current = db;
  return db;
};

export const setRouteParams = (params: Record<string, string>): void => {
  mockParams.current = params;
};

export const renderWithTheme = async (node: ReactNode) =>
  render(<ThemeProvider>{node}</ThemeProvider>);

export const seedCharacter = async (db: TestDatabase, name: string) => {
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

export const seedStorage = async (
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

export const seedItem = async (
  db: TestDatabase,
  storageId: number,
  characterId: number,
  overrides: Partial<{
    name: string;
    description: string;
    quantity: number;
    weight: number;
  }> = {},
) => {
  const inserted = await db
    .insert(itemsTable)
    .values({
      storage_location_id: storageId,
      character_id: characterId,
      name: overrides.name ?? "Rope of Climbing",
      description: overrides.description ?? null,
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
