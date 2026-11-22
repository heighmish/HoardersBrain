import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useCharacterRow = (characterId: number) => {
  const db = useDatabase();
  return useLiveQuery(
    db.query.charactersTable.findFirst({
      where: and(
        eq(charactersTable.character_id, characterId),
        isNull(charactersTable.deleted_at),
      ),
    }),
    [characterId],
  );
};
