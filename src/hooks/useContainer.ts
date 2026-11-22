import { useDatabase } from "@/db/DatabaseProvider";
import type { Storage } from "@/db/schema";
import { storageLocationsTable } from "@/db/schema";
import { toQueryState } from "@/hooks/queryState";
import type { QueryState } from "@/hooks/queryState";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useContainer = (storageId: number): QueryState<Storage> => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.storageLocationsTable.findFirst({
      where: and(
        eq(storageLocationsTable.storage_location_id, storageId),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [storageId],
  );

  return toQueryState(query, (row) => row.storage_location_id === storageId);
};
