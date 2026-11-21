import "@/testing/renderHarness";
import StorageContainer from "@/components/StorageContainer";
import {
  freshDb,
  renderWithTheme,
  seedCharacter,
  seedItem,
  seedStorage,
  setStoredTheme,
} from "@/testing/renderHarness";
import {
  act,
  fireEvent,
  screen,
} from "@testing-library/react-native";
import { router } from "expo-router";

const seedSevenItems = async (
  db: ReturnType<typeof freshDb>,
  storageId: number,
  characterId: number,
) => {
  for (const index of [0, 1, 2, 3, 4, 5, 6]) {
    await seedItem(db, storageId, characterId, { name: `Item ${index}` });
  }
};

describe("StorageContainer item list", () => {
  beforeEach(() => {
    setStoredTheme(null);
    jest.mocked(router.push).mockClear();
  });

  test("caps the collapsed list at five rows with a show-all control", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    await seedSevenItems(db, storage.storage_location_id, character.character_id);

    await renderWithTheme(<StorageContainer storage={storage} />);

    expect(await screen.findByText("Item 0")).toBeTruthy();
    expect(screen.getByText("Item 4")).toBeTruthy();
    expect(screen.queryByText("Item 5")).toBeNull();
    expect(screen.queryByText("Item 6")).toBeNull();
    expect(
      await screen.findByTestId(`container-expand-${storage.storage_location_id}`),
    ).toBeTruthy();
    expect(screen.getByText("Show all (7)")).toBeTruthy();
  });

  test("expanding shows every row and collapsing restores the cap", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    await seedSevenItems(db, storage.storage_location_id, character.character_id);

    await renderWithTheme(<StorageContainer storage={storage} />);
    const expand = await screen.findByTestId(
      `container-expand-${storage.storage_location_id}`,
    );

    await act(async () => {
      fireEvent.press(expand);
    });
    expect(screen.getByText("Item 5")).toBeTruthy();
    expect(screen.getByText("Item 6")).toBeTruthy();
    expect(screen.getByText("Show fewer")).toBeTruthy();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(`container-expand-${storage.storage_location_id}`),
      );
    });
    expect(screen.queryByText("Item 5")).toBeNull();
    expect(screen.getByText("Show all (7)")).toBeTruthy();
  });

  test("an empty container renders the empty state and no expand control", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");

    await renderWithTheme(<StorageContainer storage={storage} />);

    expect(await screen.findByText("No items")).toBeTruthy();
    expect(
      screen.queryByTestId(`container-expand-${storage.storage_location_id}`),
    ).toBeNull();
  });

  test("tapping an item row navigates to the detail screen", async () => {
    const db = freshDb();
    const character = await seedCharacter(db, "QA Hero");
    const storage = await seedStorage(db, character.character_id, "Bag of Holding");
    const item = await seedItem(db, storage.storage_location_id, character.character_id);

    await renderWithTheme(<StorageContainer storage={storage} />);
    const row = await screen.findByTestId(`item-row-${item.item_id}`);

    await act(async () => {
      fireEvent.press(row);
    });

    expect(jest.mocked(router.push)).toHaveBeenCalledWith({
      pathname: "/ItemDetail",
      params: { itemId: item.item_id },
    });
  });

  test("renders in both resolved modes without token crashes", async () => {
    for (const mode of ["light", "dark"] as const) {
      setStoredTheme({ presetId: "mind-flayer", mode, customPalettes: [] });
      const db = freshDb();
      const character = await seedCharacter(db, "QA Hero");
      const storage = await seedStorage(db, character.character_id, "Bag of Holding");
      for (const index of [0, 1, 2, 3, 4, 5]) {
        await seedItem(db, storage.storage_location_id, character.character_id, {
          name: `Item ${index}`,
        });
      }

      const { unmount } = await renderWithTheme(
        <StorageContainer storage={storage} />,
      );
      expect(await screen.findByText("Show all (6)")).toBeTruthy();
      await unmount();
    }
  });
});
