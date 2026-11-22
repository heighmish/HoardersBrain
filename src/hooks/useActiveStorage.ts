import { useDatabase } from "@/db/DatabaseProvider";
import { storageLocationsTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useActiveStorage = (storageId: number) => {
  const db = useDatabase();
  return useLiveQuery(
    db.query.storageLocationsTable.findFirst({
      where: and(
        eq(storageLocationsTable.storage_location_id, storageId),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [storageId],
  );
};
