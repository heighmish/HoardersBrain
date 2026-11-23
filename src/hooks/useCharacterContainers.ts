import { useDatabase } from "@/db/DatabaseProvider";
import { Storage, storageLocationsTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useCharacterContainers = (
  characterId: number,
): { data: Storage[]; isReady: boolean } => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: and(
        eq(storageLocationsTable.character_id, characterId),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [characterId],
  );

  return { data: query.data, isReady: query.updatedAt !== undefined };
};
