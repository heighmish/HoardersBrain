import { useDatabase } from "@/db/DatabaseProvider";
import { ensureDefaultTagsForCharacter } from "@/db/repositories/tags";
import { Tag, tagsTable } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useEffect } from "react";

export const useCharacterTags = (characterId: number): Tag[] => {
  const db = useDatabase();

  useEffect(() => {
    void ensureDefaultTagsForCharacter(db, characterId).catch(console.error);
  }, [db, characterId]);

  const query = useLiveQuery(
    db.query.tagsTable.findMany({
      where: and(
        eq(tagsTable.character_id, characterId),
        isNull(tagsTable.deleted_at),
      ),
      orderBy: [asc(tagsTable.sort_order), asc(tagsTable.tag_id)],
    }),
    [characterId],
  );

  return query.data;
};
