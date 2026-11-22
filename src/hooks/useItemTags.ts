import { useDatabase } from "@/db/DatabaseProvider";
import { itemTagsTable, Tag, tagsTable } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

// Separate single-table live queries: drizzle-orm/expo-sqlite only subscribes
// to the primary table of a join, so edits to `tags` or `item_tags` both update.
export const useItemTags = (characterId: number, itemId: number): Tag[] => {
  const db = useDatabase();

  const links = useLiveQuery(
    db.query.itemTagsTable.findMany({
      where: eq(itemTagsTable.item_id, itemId),
    }),
    [itemId],
  );

  const tags = useLiveQuery(
    db.query.tagsTable.findMany({
      where: and(
        eq(tagsTable.character_id, characterId),
        isNull(tagsTable.deleted_at),
      ),
      orderBy: [asc(tagsTable.sort_order), asc(tagsTable.tag_id)],
    }),
    [characterId],
  );

  const assignedIds = new Set(links.data.map((link) => link.tag_id));
  return tags.data.filter((tag) => assignedIds.has(tag.tag_id));
};
