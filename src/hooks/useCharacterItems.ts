import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useCharacterItems = (
  characterId: number,
): { data: Item[]; isReady: boolean; error: Error | undefined } => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.itemsTable.findMany({
      where: and(
        eq(itemsTable.character_id, characterId),
        isNull(itemsTable.deleted_at),
      ),
    }),
    [characterId],
  );

  return {
    data: query.data,
    isReady: query.updatedAt !== undefined,
    error: query.error,
  };
};
