import { useDatabase } from "@/db/DatabaseProvider";
import { Tag, tagsTable } from "@/db/schema";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

// Separate single-table live queries: drizzle-orm/expo-sqlite only subscribes
// to the primary table of a join, so edits to `tags` or `item_tags` both update.
export const useCharacterItemTags = (
  characterId: number,
): Map<number, Tag[]> => {
  const db = useDatabase();

  const tags = useLiveQuery(
    db.query.tagsTable.findMany({
      where: and(
        or(eq(tagsTable.character_id, characterId), isNull(tagsTable.character_id)),
        isNull(tagsTable.deleted_at),
      ),
      orderBy: [asc(tagsTable.sort_order), asc(tagsTable.tag_id)],
    }),
    [characterId],
  );

  const links = useLiveQuery(db.query.itemTagsTable.findMany(), []);

  const tagById = new Map<number, Tag>(
    tags.data.map((tag) => [tag.tag_id, tag]),
  );

  const byItem = new Map<number, Tag[]>();
  for (const link of links.data) {
    const tag = tagById.get(link.tag_id);
    if (tag === undefined) {
      continue;
    }
    const list = byItem.get(link.item_id) ?? [];
    list.push(tag);
    byItem.set(link.item_id, list);
  }

  for (const list of byItem.values()) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.tag_id - b.tag_id);
  }

  return byItem;
};
