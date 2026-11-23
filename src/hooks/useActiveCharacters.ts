import { useDatabase } from "@/db/DatabaseProvider";
import { Character, charactersTable } from "@/db/schema";
import { asc, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useActiveCharacters = (): {
  data: Character[];
  isReady: boolean;
  error: Error | undefined;
} => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.charactersTable.findMany({
      where: isNull(charactersTable.deleted_at),
      orderBy: asc(charactersTable.character_id),
    }),
    [],
  );

  return {
    data: query.data,
    isReady: query.updatedAt !== undefined,
    error: query.error,
  };
};
