import CreateStorageForm from "@/app/CreateStorageForm";
import {
  charactersTable,
  storageLocationsTable,
} from "@/db/schema";
import { Rarity } from "@/constants/databaseTypes";
import {
  LAST_CHARACTER_ID,
  THEME_SETTINGS,
} from "@/constants/CacheKeys";
import { createTestDb, TestDatabase } from "@/testing/db";
import {
  CharacterProvider,
  useCharacterContext,
} from "@/stores/CharacterContext";
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
  useLocalSearchParams: () => mockParams.current,
  Stack: { Screen: () => null },
}));

const mockParams: { current: Record<string, string> } = { current: {} };

const mockDb: { current?: TestDatabase } = {};

jest.mock("@/db/DatabaseProvider", () => ({
  useDatabase: () => mockDb.current,
}));

const mockRouter = jest.mocked(router);

let storedSettings: string | null = null;
let storedCharacterId: string | null = null;

beforeEach(() => {
  mockDb.current = createTestDb();
  mockParams.current = {};
  mockRouter.back.mockClear();
  storedSettings = null;
  storedCharacterId = null;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => {
      if (key === THEME_SETTINGS) {
        return storedSettings;
      }
      if (key === LAST_CHARACTER_ID) {
        return storedCharacterId;
      }
      return null;
    },
  );
});

afterEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
});

const storedTheme = (settings: Record<string, unknown>) => {
  storedSettings = JSON.stringify(settings);
};

const insertCharacter = async (db: TestDatabase) => {
  const inserted = await db
    .insert(charactersTable)
    .values({ name: "QA Hero" })
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
    description?: string;
    weight?: number;
    carrying?: boolean;
    is_fixed_weight?: boolean;
    rarity?: Rarity;
  },
) => {
  const inserted = await db
    .insert(storageLocationsTable)
    .values({
      character_id: characterId,
      name: values.name,
      description: values.description ?? null,
      weight: values.weight ?? 0,
      carrying: values.carrying ?? false,
      is_fixed_weight: values.is_fixed_weight ?? false,
      rarity: values.rarity ?? "Common",
    })
    .returning();
  const storage = inserted[0];
  if (storage === undefined) {
    throw new Error("storage insert failed");
  }
  return storage;
};

const CharacterGate = ({ children }: { children: React.ReactNode }) => {
  const { state } = useCharacterContext();
  if (state.status !== "characterSelected") {
    return null;
  }
  return <>{children}</>;
};

const renderForm = async () => {
  await render(
    <ThemeProvider>
      <CharacterProvider>
        <CharacterGate>
          <CreateStorageForm />
        </CharacterGate>
      </CharacterProvider>
    </ThemeProvider>,
  );
};

const seedSelectedCharacter = async (db: TestDatabase) => {
  const character = await insertCharacter(db);
  storedCharacterId = String(character.character_id);
  return character;
};

describe("CreateStorageForm create mode", () => {
  test("renders with the stable create-mode testIDs", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    await seedSelectedCharacter(db);

    await renderForm();

    expect(await screen.findByTestId("storage-name-input")).toBeTruthy();
    expect(screen.getByTestId("storage-description-input")).toBeTruthy();
    expect(screen.getByTestId("storage-weight-input")).toBeTruthy();
    expect(screen.getByTestId("fixed-weight-toggle")).toBeTruthy();
    expect(screen.getByTestId("carrying-toggle")).toBeTruthy();
    expect(screen.getByTestId("create-storage-button")).toBeTruthy();
    expect(screen.queryByTestId("save-storage-button")).toBeNull();
  });

  test("creates a container row and navigates back", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await seedSelectedCharacter(db);

    await renderForm();
    await fireEvent.changeText(
      await screen.findByTestId("storage-name-input"),
      "Bag of Holding",
    );
    await fireEvent.press(screen.getByTestId("create-storage-button"));

    const created = await db.query.storageLocationsTable.findFirst();
    expect(created?.name).toBe("Bag of Holding");
    expect(created?.character_id).toBe(character.character_id);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  test("renders without token crashes in dark mode", async () => {
    storedTheme({ presetId: "mind-flayer", mode: "dark", customPalettes: [] });
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    await seedSelectedCharacter(db);

    await renderForm();

    const weightLabel = await screen.findByText("Weight?");
    expect(StyleSheet.flatten(weightLabel.props.style).color).toBe("#F8F8F2");
  });
});

describe("CreateStorageForm edit mode", () => {
  test("prefills every field from the stored row and saves changes", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    const character = await seedSelectedCharacter(db);
    const bag = await insertStorage(db, character.character_id, {
      name: "Bag of Holding",
      description: "Extra dimensional space",
      weight: 1.5,
      carrying: false,
      is_fixed_weight: true,
      rarity: "Rare",
    });
    mockParams.current = {
      storageId: String(bag.storage_location_id),
    };

    await renderForm();

    const nameInput = await screen.findByTestId("storage-name-input");
    expect(nameInput.props.value).toBe("Bag of Holding");
    expect(
      (screen.getByTestId("storage-description-input").props as { value?: string }).value,
    ).toBe("Extra dimensional space");
    expect(
      (screen.getByTestId("storage-weight-input").props as { value?: string }).value,
    ).toBe("1.5");
    expect(
      (screen.getByTestId("fixed-weight-toggle").props as { value?: boolean }).value,
    ).toBe(true);
    expect(
      (screen.getByTestId("carrying-toggle").props as { value?: boolean }).value,
    ).toBe(false);
    expect(screen.getByTestId("storage-rarity-Rare")).toBeTruthy();
    expect(screen.getByTestId("save-storage-button")).toBeTruthy();
    expect(screen.queryByTestId("create-storage-button")).toBeNull();

    await fireEvent.changeText(nameInput, "Bag of Holding Two");
    await fireEvent.press(screen.getByTestId("save-storage-button"));

    const updated = await db.query.storageLocationsTable.findFirst();
    expect(updated?.name).toBe("Bag of Holding Two");
    expect(updated?.weight).toBe(1.5);
    expect(updated?.is_fixed_weight).toBe(true);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  test("shows a functional fallback when the storage row is missing", async () => {
    const db = mockDb.current;
    if (db === undefined) {
      throw new Error("test db missing");
    }
    await seedSelectedCharacter(db);
    mockParams.current = { storageId: "999" };

    await renderForm();

    expect(
      await screen.findByText("Storage container not found."),
    ).toBeTruthy();
  });
});
