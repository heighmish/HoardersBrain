import type { AppDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  itemTagsTable,
  Tag,
  tagsTable,
} from "@/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";

type RepositoryTransaction = Parameters<
  Parameters<AppDatabase["transaction"]>[0]
>[0];

type DefaultTagSeed = {
  name: string;
  is_usable?: boolean;
  children?: readonly { name: string; is_usable?: boolean }[];
};

const DEFAULT_TAG_TREE: readonly DefaultTagSeed[] = [
  {
    name: "Consumable",
    is_usable: true,
    children: [
      { name: "Potion", is_usable: true },
      { name: "Scroll", is_usable: true },
      { name: "Ammunition", is_usable: true },
      { name: "Food & Drink", is_usable: true },
    ],
  },
  { name: "Weapon" },
  { name: "Armor" },
  { name: "Magic" },
  { name: "Tool" },
  { name: "Treasure" },
  { name: "Misc" },
];

const ensuredCharacterTagIds = new Set<number>();

export const clearEnsuredTagsCache = (characterId?: number): void => {
  if (characterId === undefined) {
    ensuredCharacterTagIds.clear();
    return;
  }
  ensuredCharacterTagIds.delete(characterId);
};

export const seedDefaultTagsInTransaction = (
  tx: RepositoryTransaction,
  characterId: number,
): Map<string, number> => {
  const byName = new Map<string, number>();
  let order = 0;

  for (const root of DEFAULT_TAG_TREE) {
    const parent = tx
      .insert(tagsTable)
      .values({
        character_id: characterId,
        name: root.name,
        parent_tag_id: null,
        is_usable: root.is_usable ?? false,
        sort_order: order++,
      })
      .returning()
      .get();
    byName.set(parent.name, parent.tag_id);

    for (const child of root.children ?? []) {
      const inserted = tx
        .insert(tagsTable)
        .values({
          character_id: characterId,
          name: child.name,
          parent_tag_id: parent.tag_id,
          is_usable: child.is_usable ?? root.is_usable ?? false,
          sort_order: order++,
        })
        .returning()
        .get();
      byName.set(inserted.name, inserted.tag_id);
    }
  }

  ensuredCharacterTagIds.add(characterId);
  return byName;
};

const ensureDefaultTagsInTransaction = (
  tx: RepositoryTransaction,
  characterId: number,
): void => {
  const character = tx
    .select({ character_id: charactersTable.character_id })
    .from(charactersTable)
    .where(
      and(
        eq(charactersTable.character_id, characterId),
        isNull(charactersTable.deleted_at),
      ),
    )
    .get();

  if (character === undefined) {
    return;
  }

  // Intentionally includes soft-deleted rows so deleting all tags never re-seeds.
  const anyExisting = tx
    .select({ tag_id: tagsTable.tag_id })
    .from(tagsTable)
    .where(eq(tagsTable.character_id, characterId))
    .limit(1)
    .get();

  if (anyExisting === undefined) {
    seedDefaultTagsInTransaction(tx, characterId);
  } else {
    ensuredCharacterTagIds.add(characterId);
  }
};

export const ensureDefaultTagsForCharacter = async (
  db: AppDatabase,
  characterId: number,
): Promise<void> => {
  if (ensuredCharacterTagIds.has(characterId)) {
    return;
  }

  db.transaction((tx) => {
    ensureDefaultTagsInTransaction(tx, characterId);
  });
};

export type CreateTagInput = {
  character_id: number | null;
  name: string;
  parent_tag_id?: number | null;
  is_usable?: boolean;
};

export const createTag = async (
  db: AppDatabase,
  input: CreateTagInput,
): Promise<Tag> => {
  const trimmed = input.name.trim();
  if (trimmed.length === 0) {
    throw new Error("Tag name cannot be empty");
  }

  return db.transaction((tx) => {
    const scopeFilter =
      input.character_id === null
        ? isNull(tagsTable.character_id)
        : eq(tagsTable.character_id, input.character_id);

    const existingInScope = tx
      .select()
      .from(tagsTable)
      .where(and(scopeFilter, isNull(tagsTable.deleted_at)))
      .all();

    const duplicate = existingInScope.find(
      (tag) => tag.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate !== undefined) {
      return duplicate;
    }

    let inheritedUsable = false;
    const parentId = input.parent_tag_id ?? null;
    if (parentId !== null) {
      const parentScope =
        input.character_id === null
          ? isNull(tagsTable.character_id)
          : or(
              eq(tagsTable.character_id, input.character_id),
              isNull(tagsTable.character_id),
            );
      const parent = tx
        .select()
        .from(tagsTable)
        .where(
          and(
            eq(tagsTable.tag_id, parentId),
            parentScope,
            isNull(tagsTable.deleted_at),
          ),
        )
        .get();
      if (parent === undefined) {
        throw new Error("Parent tag not found");
      }
      if (parent.parent_tag_id !== null) {
        throw new Error("Tags can only nest one level deep");
      }
      inheritedUsable = parent.is_usable;
    }

    const nextOrder =
      existingInScope.reduce((max, tag) => Math.max(max, tag.sort_order), -1) +
      1;

    return tx
      .insert(tagsTable)
      .values({
        character_id: input.character_id,
        name: trimmed,
        parent_tag_id: parentId,
        is_usable: input.is_usable ?? inheritedUsable,
        sort_order: nextOrder,
      })
      .returning()
      .get();
  });
};

export const softDeleteTag = async (
  db: AppDatabase,
  tagId: number,
): Promise<void> => {
  db.transaction((tx) => {
    tx.update(tagsTable)
      .set({ parent_tag_id: null })
      .where(eq(tagsTable.parent_tag_id, tagId))
      .run();
    tx.update(tagsTable)
      .set({ deleted_at: new Date() })
      .where(eq(tagsTable.tag_id, tagId))
      .run();
  });
};

export const setItemTagsInTransaction = (
  tx: RepositoryTransaction,
  itemId: number,
  tagIds: readonly number[],
): void => {
  tx.delete(itemTagsTable).where(eq(itemTagsTable.item_id, itemId)).run();

  const uniqueIds = Array.from(new Set(tagIds));
  if (uniqueIds.length === 0) {
    return;
  }

  tx.insert(itemTagsTable)
    .values(uniqueIds.map((tag_id) => ({ item_id: itemId, tag_id })))
    .run();
};

/**
 * Remaps an item's active tags to the target character by case-insensitive name,
 * auto-creating missing custom tags on the recipient so transfers are lossless.
 */
export const remapItemTagsInTransaction = (
  tx: RepositoryTransaction,
  itemId: number,
  targetCharacterId: number,
): void => {
  const sourceLinks = tx
    .select({ tag_id: itemTagsTable.tag_id })
    .from(itemTagsTable)
    .where(eq(itemTagsTable.item_id, itemId))
    .all();

  if (sourceLinks.length === 0) {
    return;
  }

  ensureDefaultTagsInTransaction(tx, targetCharacterId);

  const sourceLinkIds = new Set(sourceLinks.map((row) => row.tag_id));
  const allSourceTags = tx
    .select()
    .from(tagsTable)
    .where(isNull(tagsTable.deleted_at))
    .all();
  const sourceById = new Map(allSourceTags.map((tag) => [tag.tag_id, tag]));
  const sourceTags = allSourceTags.filter((tag) =>
    sourceLinkIds.has(tag.tag_id),
  );

  const targetTags = tx
    .select()
    .from(tagsTable)
    .where(
      and(
        or(
          eq(tagsTable.character_id, targetCharacterId),
          isNull(tagsTable.character_id),
        ),
        isNull(tagsTable.deleted_at),
      ),
    )
    .all();
  const targetByLowerName = new Map(
    targetTags.map((tag) => [tag.name.toLowerCase(), tag]),
  );
  let nextOrder =
    targetTags.reduce((max, tag) => Math.max(max, tag.sort_order), -1) + 1;

  const remappedIds: number[] = [];

  for (const tag of sourceTags) {
    if (tag.character_id === null) {
      remappedIds.push(tag.tag_id);
      continue;
    }
    const existingTarget = targetByLowerName.get(tag.name.toLowerCase());
    if (existingTarget !== undefined) {
      remappedIds.push(existingTarget.tag_id);
      continue;
    }

    let targetParentId: number | null = null;
    if (tag.parent_tag_id !== null) {
      const sourceParent = sourceById.get(tag.parent_tag_id);
      if (sourceParent !== undefined) {
        const matchedParent = targetByLowerName.get(
          sourceParent.name.toLowerCase(),
        );
        if (matchedParent !== undefined && matchedParent.parent_tag_id === null) {
          targetParentId = matchedParent.tag_id;
        }
      }
    }

    const created = tx
      .insert(tagsTable)
      .values({
        character_id: targetCharacterId,
        name: tag.name,
        parent_tag_id: targetParentId,
        is_usable: tag.is_usable,
        sort_order: nextOrder++,
      })
      .returning()
      .get();
    targetByLowerName.set(created.name.toLowerCase(), created);
    remappedIds.push(created.tag_id);
  }

  setItemTagsInTransaction(tx, itemId, remappedIds);
};
