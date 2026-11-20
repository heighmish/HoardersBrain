import ChangeCharacterSheet from "@/app/ChangeCharacterSheet";
import CharacterSettingsSheet from "@/app/CharacterSettingsSheet";
import Index from "@/app/index";
import { LAST_CHARACTER_ID, THEME_SETTINGS } from "@/constants/CacheKeys";
import {
  charactersTable,
  itemsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import {
  CharacterProvider,
  useCharacterContext,
} from "@/stores/CharacterContext";
import { ThemeProvider } from "@/stores/ThemeContext";
import { createTestDb, TestDatabase } from "@/testing/db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import { ReactElement } from "react";
import { Text } from "react-native";

jest.mock("expo-router", () => ({
  Redirect: () => null,
  Stack: { Screen: () => null },
  router: { back: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

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

const seedChildRows = async (db: TestDatabase, characterId: number) => {
  const insertedStorage = await db
    .insert(storageLocationsTable)
    .values({
      character_id: characterId,
      name: "Bag",
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
    character_id: characterId,
    name: "Rope of Climbing",
    item_type: "consumable",
    weight: 1.5,
    rarity: "Common",
    quantity: 1,
  });

  await db
    .insert(ledgerTable)
    .values({ message: "Gained 50 gold", character_id: characterId });
};

const ContextProbe = () => {
  const { state } = useCharacterContext();
  if (state.status !== "characterSelected") {
    return <Text testID="probe-status">{state.status}</Text>;
  }
  return (
    <Text
      testID="probe-status"
    >{`${state.status}:${state.character.id}:${state.character.name}`}</Text>
  );
};

const GatedSettingsSheet = () => {
  const { state } = useCharacterContext();
  if (state.status !== "characterSelected") {
    return null;
  }
  return <CharacterSettingsSheet />;
};

const renderWithProviders = async (ui: ReactElement) => {
  await render(
    <ThemeProvider>
      <CharacterProvider>
        {ui}
        <ContextProbe />
      </CharacterProvider>
    </ThemeProvider>,
  );
};

const storedTheme = async (settings: Record<string, unknown>) => {
  await AsyncStorage.setItem(THEME_SETTINGS, JSON.stringify(settings));
};

const selectRow = async (characterId: number) => {
  await fireEvent.press(screen.getByTestId(`character-row-${characterId}`));
};

beforeEach(async () => {
  jest.clearAllMocks();
  mockDb.current = createTestDb();
  await AsyncStorage.clear();
});

describe("character creation", () => {
  test("creates the character and their On Person container", async () => {
    await renderWithProviders(<Index />);

    const input = await screen.findByTestId("character-name-input");
    await fireEvent.changeText(input, "QA Hero");
    await fireEvent.press(screen.getByTestId("create-character-button"));

    const db = currentDb();
    const createdCharacters = await db.query.charactersTable.findMany();
    expect(createdCharacters).toHaveLength(1);
    expect(createdCharacters[0]?.name).toBe("QA Hero");

    const createdCharacter = createdCharacters[0];
    if (createdCharacter === undefined) {
      throw new Error("character insert failed");
    }

    const containers = await db.query.storageLocationsTable.findMany({
      where: eq(
        storageLocationsTable.character_id,
        createdCharacter.character_id,
      ),
    });
    expect(containers).toHaveLength(1);
    expect(containers[0]).toMatchObject({
      character_id: createdCharacter.character_id,
      name: "On Person",
      weight: 0,
      carrying: true,
      is_fixed_weight: true,
    });

    expect(await AsyncStorage.getItem(LAST_CHARACTER_ID)).toBe(
      createdCharacter.character_id.toString(),
    );
    expect(screen.getByTestId("probe-status").props.children).toBe(
      `characterSelected:${createdCharacter.character_id}:QA Hero`,
    );
  });

  test("does not create a character for a blank name", async () => {
    await renderWithProviders(<Index />);

    const input = await screen.findByTestId("character-name-input");
    await fireEvent.changeText(input, "   ");
    await fireEvent.press(screen.getByTestId("create-character-button"));

    const db = currentDb();
    expect(await db.query.charactersTable.findMany()).toHaveLength(0);
    expect(await db.query.storageLocationsTable.findMany()).toHaveLength(0);
    expect(await AsyncStorage.getItem(LAST_CHARACTER_ID)).toBeNull();
    expect(screen.getByTestId("probe-status").props.children).toBe(
      "noCharacter",
    );
  });
});

describe("character rename", () => {
  test("updates the database row and keeps the context name in sync", async () => {
    const hero = await insertCharacter(currentDb(), "QA Hero");
    await renderWithProviders(<ChangeCharacterSheet />);
    await screen.findByTestId("create-new-character-button");

    await selectRow(hero.character_id);
    expect(screen.getByTestId("probe-status").props.children).toBe(
      `characterSelected:${hero.character_id}:QA Hero`,
    );

    await fireEvent.press(screen.getByTestId("rename-character-button"));
    const input = await screen.findByTestId("character-rename-input");
    expect(input.props.value).toBe("QA Hero");

    await fireEvent.changeText(input, "QA Renamed");
    await fireEvent.press(screen.getByTestId("character-rename-save"));

    const stored = await currentDb().query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, hero.character_id),
    });
    expect(stored?.name).toBe("QA Renamed");
    expect(screen.getByTestId("probe-status").props.children).toBe(
      `characterSelected:${hero.character_id}:QA Renamed`,
    );
  });

  test("keeps the save button disabled for a blank rename input", async () => {
    const hero = await insertCharacter(currentDb(), "QA Hero");
    await renderWithProviders(<ChangeCharacterSheet />);
    await screen.findByTestId("create-new-character-button");

    await selectRow(hero.character_id);
    await fireEvent.press(screen.getByTestId("rename-character-button"));
    const input = await screen.findByTestId("character-rename-input");

    await fireEvent.changeText(input, "   ");
    expect(
      screen.getByTestId("character-rename-save").props.accessibilityState
        .disabled,
    ).toBe(true);

    await fireEvent.changeText(input, "QA Renamed");
    expect(
      screen.getByTestId("character-rename-save").props.accessibilityState
        .disabled,
    ).toBe(false);
  });
});

describe("character delete", () => {
  test("removes child rows, deletes the character, and switches to the remaining one", async () => {
    const db = currentDb();
    const hero = await insertCharacter(db, "QA Hero");
    const second = await insertCharacter(db, "QA Second");
    await seedChildRows(db, second.character_id);

    await renderWithProviders(<ChangeCharacterSheet />);
    await screen.findByTestId("create-new-character-button");

    await selectRow(second.character_id);
    await fireEvent.press(screen.getByTestId("delete-character-button"));
    await screen.findByTestId("character-delete-confirm");
    await fireEvent.press(screen.getByTestId("character-delete-confirm"));

    expect(
      await db.query.itemsTable.findMany({
        where: eq(itemsTable.character_id, second.character_id),
      }),
    ).toHaveLength(0);
    expect(
      await db.query.storageLocationsTable.findMany({
        where: eq(storageLocationsTable.character_id, second.character_id),
      }),
    ).toHaveLength(0);
    expect(
      await db.query.ledgerTable.findMany({
        where: eq(ledgerTable.character_id, second.character_id),
      }),
    ).toHaveLength(0);

    const remainingCharacters = await db.query.charactersTable.findMany();
    expect(remainingCharacters).toHaveLength(1);
    expect(remainingCharacters[0]?.character_id).toBe(hero.character_id);

    expect(screen.getByTestId("probe-status").props.children).toBe(
      `characterSelected:${hero.character_id}:QA Hero`,
    );
    expect(await AsyncStorage.getItem(LAST_CHARACTER_ID)).toBe(
      hero.character_id.toString(),
    );
    expect(router.back).toHaveBeenCalled();
  });

  test("clears the selection and stored id when the last character is deleted", async () => {
    const db = currentDb();
    const hero = await insertCharacter(db, "QA Hero");
    await seedChildRows(db, hero.character_id);

    await renderWithProviders(<ChangeCharacterSheet />);
    await screen.findByTestId("create-new-character-button");

    await selectRow(hero.character_id);
    await fireEvent.press(screen.getByTestId("delete-character-button"));
    await screen.findByTestId("character-delete-confirm");
    await fireEvent.press(screen.getByTestId("character-delete-confirm"));

    expect(await db.query.charactersTable.findMany()).toHaveLength(0);
    expect(await db.query.itemsTable.findMany()).toHaveLength(0);
    expect(await db.query.storageLocationsTable.findMany()).toHaveLength(0);
    expect(await db.query.ledgerTable.findMany()).toHaveLength(0);

    expect(screen.getByTestId("probe-status").props.children).toBe(
      "noCharacter",
    );
    expect(await AsyncStorage.getItem(LAST_CHARACTER_ID)).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});

describe("character settings sheet", () => {
  const openSettingsSheet = async () => {
    const hero = await insertCharacter(currentDb(), "QA Hero");
    await AsyncStorage.setItem(
      LAST_CHARACTER_ID,
      hero.character_id.toString(),
    );
    await renderWithProviders(<GatedSettingsSheet />);
    await screen.findByTestId("character-settings-save");
    return hero;
  };

  test("saves max encumbrance and weight tracking to the character row", async () => {
    const hero = await openSettingsSheet();

    const input = await screen.findByTestId("character-max-encumbrance-input");
    expect(input.props.value).toBe("100");

    await fireEvent.changeText(input, "150");
    await fireEvent(
      screen.getByTestId("character-weight-tracking-toggle"),
      "valueChange",
      false,
    );
    await fireEvent.press(screen.getByTestId("character-settings-save"));

    const stored = await currentDb().query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, hero.character_id),
    });
    expect(stored?.max_encumbrance).toBe(150);
    expect(stored?.weight_tracking).toBe(false);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test("round-trips the weight tracking toggle without touching max encumbrance", async () => {
    const hero = await openSettingsSheet();

    await fireEvent(
      screen.getByTestId("character-weight-tracking-toggle"),
      "valueChange",
      false,
    );
    await fireEvent.press(screen.getByTestId("character-settings-save"));
    let stored = await currentDb().query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, hero.character_id),
    });
    expect(stored?.weight_tracking).toBe(false);
    expect(stored?.max_encumbrance).toBe(100);

    await fireEvent(
      screen.getByTestId("character-weight-tracking-toggle"),
      "valueChange",
      true,
    );
    await fireEvent.press(screen.getByTestId("character-settings-save"));
    stored = await currentDb().query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, hero.character_id),
    });
    expect(stored?.weight_tracking).toBe(true);
    expect(stored?.max_encumbrance).toBe(100);
  });

  test("rejects non-positive and non-integer max encumbrance values", async () => {
    await openSettingsSheet();
    const input = await screen.findByTestId("character-max-encumbrance-input");

    for (const invalidValue of ["", "abc", "0", "-5", "2.5"]) {
      await fireEvent.changeText(input, invalidValue);
      expect(
        screen.getByTestId("character-settings-save").props.accessibilityState
          .disabled,
      ).toBe(true);
      expect(
        screen.getByTestId("character-max-encumbrance-error"),
      ).toBeTruthy();
    }

    await fireEvent.changeText(input, "12");
    expect(
      screen.getByTestId("character-settings-save").props.accessibilityState
        .disabled,
    ).toBe(false);
    expect(
      screen.queryByTestId("character-max-encumbrance-error"),
    ).toBeNull();
  });

  test("the steppers step the max encumbrance input and clamp at 1", async () => {
    await openSettingsSheet();

    await fireEvent(
      screen.getByTestId("numeric-increment"),
      "pressIn",
    );
    expect(
      screen.getByTestId("character-max-encumbrance-input").props.value,
    ).toBe("101");

    await fireEvent(
      screen.getByTestId("numeric-decrement"),
      "pressIn",
    );
    expect(
      screen.getByTestId("character-max-encumbrance-input").props.value,
    ).toBe("100");

    await fireEvent.changeText(
      screen.getByTestId("character-max-encumbrance-input"),
      "1",
    );
    await fireEvent(
      screen.getByTestId("numeric-decrement"),
      "pressIn",
    );
    expect(
      screen.getByTestId("character-max-encumbrance-input").props.value,
    ).toBe("1");
  });
});

describe("theme coverage", () => {
  test("the change character sheet renders its actions in resolved dark mode", async () => {
    await storedTheme({ presetId: "gruvbox", mode: "dark", customPalettes: [] });
    const hero = await insertCharacter(currentDb(), "QA Hero");
    await renderWithProviders(<ChangeCharacterSheet />);

    await screen.findByTestId(`character-row-${hero.character_id}`);
    await selectRow(hero.character_id);
    expect(screen.getByTestId("rename-character-button")).toBeTruthy();
    expect(screen.getByTestId("delete-character-button")).toBeTruthy();
  });

  test("the character settings sheet renders in resolved dark mode", async () => {
    await storedTheme({ presetId: "gruvbox", mode: "dark", customPalettes: [] });
    const hero = await insertCharacter(currentDb(), "QA Hero");
    await AsyncStorage.setItem(
      LAST_CHARACTER_ID,
      hero.character_id.toString(),
    );
    await renderWithProviders(<GatedSettingsSheet />);

    expect(
      await screen.findByTestId("character-settings-save"),
    ).toBeTruthy();
    expect(screen.getByText("Max Encumbrance")).toBeTruthy();
    expect(screen.getByText("Weight Tracking")).toBeTruthy();
  });
});
