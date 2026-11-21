import "@/testing/renderHarness";
import CreateItemForm from "@/app/CreateItemForm";
import { itemsTable } from "@/db/schema";
import {
  freshDb,
  renderWithTheme,
  seedCharacter,
  seedItem,
  seedStorage,
  setRouteParams,
  setStoredTheme,
} from "@/testing/renderHarness";
import {
  act,
  fireEvent,
  screen,
} from "@testing-library/react-native";
import { eq } from "drizzle-orm";
import { router } from "expo-router";

jest.mock("@/stores/CharacterContext", () => ({
  useSelectedCharacter: () => ({ id: 1, name: "QA Hero" }),
}));

describe("CreateItemForm", () => {
  beforeEach(() => {
    setStoredTheme(null);
    jest.mocked(router.back).mockClear();
    jest.mocked(router.push).mockClear();
  });

  test("edit mode prefills every field from the stored item", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id, {
      quantity: 3,
      description: "50 feet of hemp",
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<CreateItemForm />);

    const nameInput = await screen.findByTestId("item-name-input");
    expect(nameInput.props.value).toBe("Rope of Climbing");
    expect(screen.getByTestId("item-description-input").props.value).toBe(
      "50 feet of hemp",
    );
    expect(screen.getByTestId("item-weight-input").props.value).toBe("1.5");
    expect(screen.getByTestId("item-quantity-input").props.value).toBe("3");
    expect(
      screen.getByTestId("item-rarity-Uncommon").props.accessibilityState
        .selected,
    ).toBe(true);
    expect(screen.getByTestId("save-item-button")).toBeTruthy();
    expect(screen.queryByTestId("create-item-button")).toBeNull();
  });

  test("saving an edit updates the row and navigates back", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id, {
      quantity: 3,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<CreateItemForm />);
    await screen.findByTestId("save-item-button");

    await act(async () => {
      fireEvent.changeText(
        screen.getByTestId("item-name-input"),
        "Rope of Climbing II",
      );
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("item-quantity-input"), "5");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("save-item-button"));
    });

    const updated = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.item_id, item.item_id),
    });
    expect(updated?.name).toBe("Rope of Climbing II");
    expect(updated?.quantity).toBe(5);
    expect(updated?.weight).toBe(1.5);
    expect(updated?.rarity).toBe("Uncommon");
    expect(updated?.storage_location_id).toBe(storage.storage_location_id);
    expect(updated?.character_id).toBe(character.character_id);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  test("create mode keeps the create testIDs and inserts the quantity", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");

    setRouteParams({ storageId: String(storage.storage_location_id) });
    await renderWithTheme(<CreateItemForm />);

    const nameInput = await screen.findByTestId("item-name-input");
    expect(nameInput.props.value).toBe("");
    expect(screen.getByTestId("create-item-button")).toBeTruthy();
    expect(screen.queryByTestId("save-item-button")).toBeNull();

    await act(async () => {
      fireEvent.changeText(nameInput, "Torch");
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("item-quantity-input"), "4");
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("create-item-button"));
    });

    const created = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.name, "Torch"),
    });
    expect(created?.quantity).toBe(4);
    expect(created?.storage_location_id).toBe(storage.storage_location_id);
    expect(created?.character_id).toBe(character.character_id);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  test("an unknown item renders the fallback", async () => {
    freshDb();
    setRouteParams({ itemId: "999" });
    await renderWithTheme(<CreateItemForm />);

    expect(await screen.findByText("Item not found")).toBeTruthy();
  });

  test("renders in both resolved modes without token crashes", async () => {
    for (const mode of ["light", "dark"] as const) {
      setStoredTheme({ presetId: "mind-flayer", mode, customPalettes: [] });
      const db = freshDb();
      const character = await seedCharacter(db, "QA Hero");
      const storage = await seedStorage(db, character.character_id, "Bag of Holding");
      const item = await seedItem(db, storage.storage_location_id, character.character_id);

      setRouteParams({ itemId: String(item.item_id) });
      const { unmount } = await renderWithTheme(<CreateItemForm />);
      expect(await screen.findByTestId("item-name-input")).toBeTruthy();
      await unmount();
    }
  });
});
