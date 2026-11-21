import "@/testing/renderHarness";
import MoveItemPicker from "@/app/MoveItemPicker";
import SplitItemForm from "@/app/SplitItemForm";
import TransferItemPicker from "@/app/TransferItemPicker";
import {
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
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

describe("SplitItemForm", () => {
  beforeEach(() => {
    setStoredTheme(null);
    jest.mocked(router.back).mockClear();
  });

  test("splitting moves k into a destination container", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, character.character_id, "Bag of Holding");
    const satchel = await seedStorage(db, character.character_id, "Satchel");
    const item = await seedItem(db, bag.storage_location_id, character.character_id, {
      quantity: 5,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<SplitItemForm />);
    await screen.findByTestId("confirm-split-button");

    expect(screen.getByText("Quantity: 5")).toBeTruthy();
    expect(screen.getByText("Choose 1 to 4")).toBeTruthy();
    expect(
      screen.getByTestId(`split-destination-${satchel.storage_location_id}`),
    ).toBeTruthy();
    expect(
      screen.queryByTestId(`split-destination-${bag.storage_location_id}`),
    ).toBeNull();

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("split-amount-input"), "2");
    });
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`split-destination-${satchel.storage_location_id}`),
      );
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId("confirm-split-button"));
    });

    const original = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.item_id, item.item_id),
    });
    expect(original?.quantity).toBe(3);
    expect(original?.storage_location_id).toBe(bag.storage_location_id);

    const moved = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.storage_location_id, satchel.storage_location_id),
    });
    expect(moved?.name).toBe("Rope of Climbing");
    expect(moved?.quantity).toBe(2);
    expect(moved?.character_id).toBe(character.character_id);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  test("the split confirm stays disabled until amount and destination are valid", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, character.character_id, "Bag of Holding");
    const satchel = await seedStorage(db, character.character_id, "Satchel");
    const item = await seedItem(db, bag.storage_location_id, character.character_id, {
      quantity: 3,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<SplitItemForm />);

    const confirm = await screen.findByTestId("confirm-split-button");
    expect(confirm.props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent.changeText(screen.getByTestId("split-amount-input"), "1");
    });
    expect(
      screen.getByTestId("confirm-split-button").props.accessibilityState
        .disabled,
    ).toBe(true);

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`split-destination-${satchel.storage_location_id}`),
      );
    });
    expect(
      screen.getByTestId("confirm-split-button").props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  test("the split confirm rejects an amount outside the range", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, character.character_id, "Bag of Holding");
    const satchel = await seedStorage(db, character.character_id, "Satchel");
    const item = await seedItem(db, bag.storage_location_id, character.character_id, {
      quantity: 3,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<SplitItemForm />);

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`split-destination-${satchel.storage_location_id}`),
      );
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId("split-amount-input"), "3");
    });
    expect(
      screen.getByTestId("confirm-split-button").props.accessibilityState
        .disabled,
    ).toBe(true);
  });

  test("a stack of one cannot split", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, bag.storage_location_id, character.character_id, {
      quantity: 1,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<SplitItemForm />);

    expect(await screen.findByText("Cannot split a stack of 1")).toBeTruthy();
    expect(screen.queryByTestId("confirm-split-button")).toBeNull();
  });

  test("renders in both resolved modes without token crashes", async () => {
    for (const mode of ["light", "dark"] as const) {
      setStoredTheme({ presetId: "mind-flayer", mode, customPalettes: [] });
      const db = freshDb();
      const character = await seedCharacter(db, "QA Hero");
      const bag = await seedStorage(db, character.character_id, "Bag of Holding");
      const item = await seedItem(db, bag.storage_location_id, character.character_id, {
        quantity: 3,
      });

      setRouteParams({ itemId: String(item.item_id) });
      const { unmount } = await renderWithTheme(<SplitItemForm />);
      expect(await screen.findByText("Choose 1 to 2")).toBeTruthy();
      await unmount();
    }
  });
});

describe("MoveItemPicker", () => {
  beforeEach(() => {
    setStoredTheme(null);
    jest.mocked(router.back).mockClear();
  });

  test("tapping a container moves the item there", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, character.character_id, "Bag of Holding");
    const satchel = await seedStorage(db, character.character_id, "Satchel");
    const item = await seedItem(db, bag.storage_location_id, character.character_id);

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<MoveItemPicker />);

    expect(
      await screen.findByTestId(`move-destination-${satchel.storage_location_id}`),
    ).toBeTruthy();
    expect(
      screen.queryByTestId(`move-destination-${bag.storage_location_id}`),
    ).toBeNull();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`move-destination-${satchel.storage_location_id}`),
      );
    });

    const moved = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.item_id, item.item_id),
    });
    expect(moved?.storage_location_id).toBe(satchel.storage_location_id);
    expect(moved?.character_id).toBe(character.character_id);
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  test("with no other containers the picker shows the empty state", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, bag.storage_location_id, character.character_id);

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<MoveItemPicker />);

    expect(await screen.findByText("No other containers")).toBeTruthy();
    expect(
      screen.queryByTestId(`move-destination-${bag.storage_location_id}`),
    ).toBeNull();
  });

  test("renders in both resolved modes without token crashes", async () => {
    for (const mode of ["light", "dark"] as const) {
      setStoredTheme({ presetId: "mind-flayer", mode, customPalettes: [] });
      const db = freshDb();
      const character = await seedCharacter(db, "QA Hero");
      const bag = await seedStorage(db, character.character_id, "Bag of Holding");
      const satchel = await seedStorage(db, character.character_id, "Satchel");
      const item = await seedItem(db, bag.storage_location_id, character.character_id);

      setRouteParams({ itemId: String(item.item_id) });
      const { unmount } = await renderWithTheme(<MoveItemPicker />);
      expect(
        await screen.findByTestId(`move-destination-${satchel.storage_location_id}`),
      ).toBeTruthy();
      await unmount();
    }
  });
});

describe("TransferItemPicker", () => {
  beforeEach(() => {
    setStoredTheme(null);
    jest.mocked(router.back).mockClear();
    jest.mocked(router.dismiss).mockClear();
  });

  test("tapping a character transfers the stack and writes both ledger rows", async () => {
    const db = freshDb();
    const hero = await seedCharacter(db, "QA Hero");
    const second = await seedCharacter(db, "QA Second");
    const bag = await seedStorage(db, hero.character_id, "Bag of Holding");
    const item = await seedItem(db, bag.storage_location_id, hero.character_id, {
      quantity: 2,
    });

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<TransferItemPicker />);

    expect(
      await screen.findByTestId(`transfer-target-${second.character_id}`),
    ).toBeTruthy();
    expect(
      screen.queryByTestId(`transfer-target-${hero.character_id}`),
    ).toBeNull();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`transfer-target-${second.character_id}`),
      );
    });

    const moved = await db.query.itemsTable.findFirst({
      where: eq(itemsTable.item_id, item.item_id),
    });
    expect(moved?.character_id).toBe(second.character_id);

    const onPerson = await db.query.storageLocationsTable.findFirst({
      where: eq(
        storageLocationsTable.character_id,
        second.character_id,
      ),
    });
    expect(onPerson?.name).toBe("On Person");
    expect(onPerson?.carrying).toBe(true);
    expect(onPerson?.is_fixed_weight).toBe(true);
    expect(onPerson?.weight).toBe(0);
    expect(moved?.storage_location_id).toBe(onPerson?.storage_location_id);

    const rows = await db.query.ledgerTable.findMany();
    expect(rows).toHaveLength(2);
    expect(
      rows.find((row) => row.character_id === hero.character_id)?.message,
    ).toBe("Transferred Rope of Climbing x2 to QA Second");
    expect(
      rows.find((row) => row.character_id === second.character_id)?.message,
    ).toBe("Received Rope of Climbing x2 from QA Hero");
    expect(jest.mocked(router.dismiss)).toHaveBeenCalledWith(2);
  });

  test("with no other characters the picker shows the empty state", async () => {
    const db = freshDb();
    const hero = await seedCharacter(db, "QA Hero");
    const bag = await seedStorage(db, hero.character_id, "Bag of Holding");
    const item = await seedItem(db, bag.storage_location_id, hero.character_id);

    setRouteParams({ itemId: String(item.item_id) });
    await renderWithTheme(<TransferItemPicker />);

    expect(await screen.findByText("No other characters")).toBeTruthy();
    expect(
      screen.queryByTestId(`transfer-target-${hero.character_id}`),
    ).toBeNull();
  });

  test("renders in both resolved modes without token crashes", async () => {
    for (const mode of ["light", "dark"] as const) {
      setStoredTheme({ presetId: "mind-flayer", mode, customPalettes: [] });
      const db = freshDb();
      const hero = await seedCharacter(db, "QA Hero");
      const second = await seedCharacter(db, "QA Second");
      const bag = await seedStorage(db, hero.character_id, "Bag of Holding");
      const item = await seedItem(db, bag.storage_location_id, hero.character_id);

      setRouteParams({ itemId: String(item.item_id) });
      const { unmount } = await renderWithTheme(<TransferItemPicker />);
      expect(
        await screen.findByTestId(`transfer-target-${second.character_id}`),
      ).toBeTruthy();
      await unmount();
    }
  });
});
