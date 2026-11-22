import { useDatabase } from "@/db/DatabaseProvider";
import type { Item } from "@/db/schema";
import { itemsTable } from "@/db/schema";
import { toQueryState } from "@/hooks/queryState";
import type { QueryState } from "@/hooks/queryState";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useItem = (itemId: number): QueryState<Item> => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.itemsTable.findFirst({
      where: and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)),
    }),
    [itemId],
  );

  return toQueryState(query, (row) => row.item_id === itemId);
};
