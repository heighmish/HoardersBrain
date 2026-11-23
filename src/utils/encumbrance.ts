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

export const formatWeight = (value: number): string =>
  String(Number(value.toFixed(2)));

export const calculateCarriedItemsWeight = (
  rows: readonly CarriedItemRow[],
): number =>
  rows.reduce((total, row) => {
    if (!row.isCarrying || row.isFixedWeight) {
      return total;
    }
    return total + row.itemWeight * row.itemQuantity;
  }, 0);

export interface EncumbranceItemLike {
  storage_location_id: number;
  weight: number;
  quantity: number;
}

export interface EncumbranceContainerLike {
  storage_location_id: number;
  weight: number;
  carrying: boolean;
  is_fixed_weight: boolean;
}

export const sumCarriedWeight = (
  items: readonly EncumbranceItemLike[],
  containers: readonly EncumbranceContainerLike[],
): number => {
  const containerById = new Map<number, EncumbranceContainerLike>(
    containers.map((container) => [container.storage_location_id, container]),
  );
  const carriedRows: CarriedItemRow[] = items.flatMap((item) => {
    const storage = containerById.get(item.storage_location_id);
    if (storage === undefined) {
      return [];
    }
    return [
      {
        itemWeight: item.weight,
        itemQuantity: item.quantity,
        isFixedWeight: storage.is_fixed_weight,
        isCarrying: storage.carrying,
      },
    ];
  });
  const containerWeight = containers.reduce(
    (total, container) =>
      container.carrying ? total + container.weight : total,
    0,
  );
  return calculateCarriedItemsWeight(carriedRows) + containerWeight;
};
