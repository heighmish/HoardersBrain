import "@/testing/renderHarness";
import ItemComponent from "@/components/ItemComponent";
import { Item } from "@/db/schema";
import { renderWithTheme } from "@/testing/renderHarness";
import { screen } from "@testing-library/react-native";

const item: Item = {
  item_id: 1,
  storage_location_id: 1,
  character_id: 1,
  name: "Rope of Climbing",
  description: null,
  item_type: "consumable",
  weight: 1.5,
  rarity: "Uncommon",
  properties: null,
  quantity: 3,
};

describe("ItemComponent accessibility", () => {
  test("the row leaves its child texts in the accessibility tree", async () => {
    await renderWithTheme(<ItemComponent item={item} />);
    const row = await screen.findByTestId("item-row-1");
    expect(row.props.accessible).toBe(false);
  });
});
