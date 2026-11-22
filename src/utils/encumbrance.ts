export type EncumbranceTone = "success" | "warning" | "error";

export const determineEncumbranceTone = (
  carrying: number,
  maxEncumbrance: number,
): EncumbranceTone => {
  if (carrying >= maxEncumbrance * 1.5) {
    return "error";
  }
  if (carrying >= maxEncumbrance) {
    return "warning";
  }
  return "success";
};

export interface CarriedItemRow {
  itemWeight: number;
  itemQuantity: number;
  isFixedWeight: boolean;
  isCarrying: boolean;
}

export const calculateCarriedItemsWeight = (
  rows: readonly CarriedItemRow[],
): number =>
  rows.reduce((total, row) => {
    if (!row.isCarrying || row.isFixedWeight) {
      return total;
    }
    return total + row.itemWeight * row.itemQuantity;
  }, 0);
