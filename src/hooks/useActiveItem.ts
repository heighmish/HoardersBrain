import { useDatabase } from "@/db/DatabaseProvider";
import { itemsTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useActiveItem = (itemId: number) => {
  const db = useDatabase();
  return useLiveQuery(
    db.query.itemsTable.findFirst({
      where: and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)),
    }),
    [itemId],
  );
};
