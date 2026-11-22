import { useDatabase } from "@/db/DatabaseProvider";
import type { Character } from "@/db/schema";
import { charactersTable } from "@/db/schema";
import { toQueryState } from "@/hooks/queryState";
import type { QueryState } from "@/hooks/queryState";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

export const useCharacter = (characterId: number): QueryState<Character> => {
  const db = useDatabase();
  const query = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: and(
        eq(charactersTable.character_id, characterId),
        isNull(charactersTable.deleted_at),
      ),
    }),
    [characterId],
  );

  return toQueryState(query, (row) => row.character_id === characterId);
};
