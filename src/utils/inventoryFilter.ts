import type { Item, Tag } from "@/db/schema";

export type TagFilter = null | "usable" | number;

export interface InventoryFilterCriteria {
  query: string;
  tagFilter: TagFilter;
}

export const itemMatchesFilter = (
  item: Pick<Item, "name" | "description">,
  itemTags: readonly Tag[],
  tagById: ReadonlyMap<number, Tag>,
  criteria: InventoryFilterCriteria,
): boolean => {
  const { tagFilter } = criteria;
  if (tagFilter === "usable") {
    if (!itemTags.some((tag) => tag.is_usable)) {
      return false;
    }
  } else if (typeof tagFilter === "number") {
    const matchesSelected = itemTags.some(
      (tag) => tag.tag_id === tagFilter || tag.parent_tag_id === tagFilter,
    );
    if (!matchesSelected) {
      return false;
    }
  }

  const normalizedQuery = criteria.query.trim().toLowerCase();
  if (normalizedQuery.length === 0) {
    return true;
  }

  if (item.name.toLowerCase().includes(normalizedQuery)) {
    return true;
  }
  if (item.description?.toLowerCase().includes(normalizedQuery)) {
    return true;
  }
  return itemTags.some((tag) => {
    if (tag.name.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
    if (tag.parent_tag_id !== null) {
      const parent = tagById.get(tag.parent_tag_id);
      if (parent?.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
    }
    return false;
  });
};
