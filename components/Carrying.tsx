import { useDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import { and, eq, sum } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Text, View } from "react-native";

interface CarryingProps {
  characterId: number;
}

const Carrying: React.FC<CarryingProps> = ({ characterId }) => {
  const db = useDatabase();
  const maxEncumbrance = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterId),
      columns: { max_encumbrance: true },
    }),
    [characterId],
  );

  const items = useLiveQuery(
    db
      .select()
      .from(itemsTable)
      .leftJoin(
        storageLocationsTable,
        eq(
          itemsTable.storage_location_id,
          storageLocationsTable.storage_location_id,
        ),
      )
      .where(eq(itemsTable.character_id, characterId)),
  );

  const containerWeightQuery = useLiveQuery(
    db
      .select({
        totalWeight: sum(storageLocationsTable.weight),
      })
      .from(storageLocationsTable)
      .where(
        and(
          eq(storageLocationsTable.character_id, characterId),
          eq(storageLocationsTable.carrying, true),
        ),
      ),
  );

  const containerWeight = containerWeightQuery.data[0]?.totalWeight ?? "0";

  const itemsWeight = items.data.reduce((total, data) => {
    if (
      data?.storage_locations?.carrying === false ||
      data?.storage_locations?.is_fixed_weight === true
    ) {
      return total;
    }

    return total + data.items.weight;
  }, 0);

  if (!maxEncumbrance.data || maxEncumbrance.error) {
    return (
      <View>
        <Text>Failed to load character information</Text>
      </View>
    );
  }
  return (
    <View>
      <Text>Items: {itemsWeight}lb</Text>
      <Text>Containers: {containerWeight}lb</Text>
      <Text>Encumbered</Text>
    </View>
  );
};

export default Carrying;
