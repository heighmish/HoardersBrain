import { useDatabase } from "@/db/DatabaseProvider";
import { itemTagsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useItemTagLinks = (
  itemId: number,
): { tagIds: number[]; isReady: boolean; error: Error | undefined } => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.itemTagsTable.findMany({
      where: eq(itemTagsTable.item_id, itemId),
    }),
    [itemId],
  );

  return {
    tagIds: query.data.map((link) => link.tag_id),
    isReady: query.updatedAt !== undefined,
    error: query.error,
  };
};
