import { useDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import { and, eq, sum } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Text, View } from "react-native";
import Badge from "./Basic/Badge";

interface CarryingProps {
  characterId: number;
}

const DetermineEncumberanceColour = (
  carrying: number,
  maxEncumbrance: number,
) => {
  if (carrying < maxEncumbrance) {
    return "success";
  } else if (carrying >= maxEncumbrance * 1.5) {
    return "error";
  } else if (carrying >= maxEncumbrance) {
    return "warning";
  } else {
    return "error";
  }
};

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
    [characterId],
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
    [characterId],
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

  const totalCarriedWeight = Number(itemsWeight) + Number(containerWeight);

  if (!maxEncumbrance.data || maxEncumbrance.error) {
    return (
      <View>
        <Text>Failed to load character information</Text>
      </View>
    );
  }

  return (
    <View>
      <Badge
        colour={DetermineEncumberanceColour(
          totalCarriedWeight,
          Number(maxEncumbrance.data.max_encumbrance),
        )}
        text="Encumbrance"
      />
      <Text>
        Carrying: {totalCarriedWeight}/{maxEncumbrance.data.max_encumbrance} lb
      </Text>
    </View>
  );
};

export default Carrying;
