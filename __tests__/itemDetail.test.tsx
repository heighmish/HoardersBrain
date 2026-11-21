import "@/testing/renderHarness";
import ItemDetail from "@/app/ItemDetail";
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
import { StyleSheet } from "react-native";

describe("ItemDetail", () => {
  beforeEach(() => {
    setStoredTheme(null);
    jest.mocked(router.back).mockClear();
  });

  test("renders every item field and the container name", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id, {
      quantity: 3,
      description: "50 feet of hemp",
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<ItemDetail />);

    expect(await screen.findByText("Rope of Climbing")).toBeTruthy();
    expect(screen.getByText("Uncommon")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("1.5")).toBeTruthy();
    expect(screen.getByText("consumable")).toBeTruthy();
    expect(screen.getByText("Bag of Holding")).toBeTruthy();
    expect(screen.getByText("50 feet of hemp")).toBeTruthy();
    expect(screen.getByTestId("edit-item-button")).toBeTruthy();
    expect(screen.getByTestId("split-item-button")).toBeTruthy();
    expect(screen.getByTestId("move-item-button")).toBeTruthy();
    expect(screen.getByTestId("transfer-item-button")).toBeTruthy();
    expect(screen.getByTestId("remove-one-button")).toBeTruthy();
    expect(screen.getByTestId("remove-all-button")).toBeTruthy();
    expect(screen.queryByTestId("delete-item-button")).toBeNull();
  });

  test("a quantity-1 item offers a straight delete", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id, {
      quantity: 1,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<ItemDetail />);

    expect(await screen.findByTestId("delete-item-button")).toBeTruthy();
    expect(screen.queryByTestId("remove-one-button")).toBeNull();
    expect(screen.queryByTestId("remove-all-button")).toBeNull();
    expect(screen.queryByTestId("split-item-button")).toBeNull();
  });

  test("remove one decrements the stack and stays on the screen", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id, {
      quantity: 3,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<ItemDetail />);
    const removeOneButton = await screen.findByTestId("remove-one-button");

    await act(async () => {
      fireEvent.press(removeOneButton);
    });

    const updated = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.item_id, item.item_id),
    });
    expect(updated?.quantity).toBe(2);
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
  });

  test("remove all deletes the row and navigates back", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id, {
      quantity: 3,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<ItemDetail />);
    const removeAllButton = await screen.findByTestId("remove-all-button");

    await act(async () => {
      fireEvent.press(removeAllButton);
    });

    expect(await db.query.itemsTable.findMany()).toHaveLength(0);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  test("an unknown item renders the fallback", async () => {
    freshDb();
    setRouteParams({ itemId: "999" });
    await renderWithTheme(<ItemDetail />);

    expect(await screen.findByText("Item not found")).toBeTruthy();
    expect(screen.getByTestId("item-not-found-back")).toBeTruthy();
  });

  test("follows a resolved dark mode for the title color", async () => {
    setStoredTheme({ presetId: "mind-flayer", mode: "dark", customPalettes: [] });
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id);

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<ItemDetail />);

    const heading = await screen.findByText("Rope of Climbing");
    expect(StyleSheet.flatten(heading.props.style).color).toBe("#F8F8F2");
  });

  test("follows a resolved light mode for the title color", async () => {
    setStoredTheme({ presetId: "mind-flayer", mode: "light", customPalettes: [] });
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id);

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<ItemDetail />);

    const heading = await screen.findByText("Rope of Climbing");
    expect(StyleSheet.flatten(heading.props.style).color).toBe("#282A36");
  });
});
