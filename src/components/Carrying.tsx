import Badge from "@/components/Basic/Badge";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { useDatabase } from "@/db/DatabaseProvider";
import { itemsTable, Storage, storageLocationsTable } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useCharacter } from "@/hooks/useCharacter";
import {
  CarriedItemRow,
  calculateCarriedItemsWeight,
  determineEncumbranceTone,
} from "@/utils/encumbrance";

interface CarryingProps {
  characterId: number;
}

const Carrying: React.FC<CarryingProps> = ({ characterId }) => {
  const theme = useTheme();
  const db = useDatabase();
  const character = useCharacter(characterId);

  // Separate single-table live queries: drizzle-orm/expo-sqlite only listens
  // for changes on the primary table, so a joined query misses container edits.
  const items = useLiveQuery(
    db.query.itemsTable.findMany({
      where: and(
        eq(itemsTable.character_id, characterId),
        isNull(itemsTable.deleted_at),
      ),
    }),
    [characterId],
  );

  const containers = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: and(
        eq(storageLocationsTable.character_id, characterId),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [characterId],
  );

  const containerById = new Map<number, Storage>(
    containers.data.map((container) => [
      container.storage_location_id,
      container,
    ]),
  );

  const carriedRows: CarriedItemRow[] = items.data.flatMap((item) => {
    const storage = containerById.get(item.storage_location_id);

    if (storage === undefined) {
      return [];
    }

    return [
      {
        itemWeight: item.weight,
        itemQuantity: item.quantity,
        isFixedWeight: storage.is_fixed_weight,
        isCarrying: storage.carrying,
      },
    ];
  });

  const containerWeight = containers.data.reduce(
    (total, container) => (container.carrying ? total + container.weight : total),
    0,
  );
  const totalCarriedWeight =
    calculateCarriedItemsWeight(carriedRows) + containerWeight;

  if (character.status === "error" || items.error || containers.error) {
    return (
      <View>
        <ThemedText variant="body">
          Failed to load character information
        </ThemedText>
      </View>
    );
  }

  if (
    character.status !== "ready" ||
    items.updatedAt === undefined ||
    containers.updatedAt === undefined
  ) {
    return null;
  }

  if (character.data.weight_tracking === false) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadows.card,
        borderRadius: theme.radius.lg,
        borderCurve: "continuous",
        padding: theme.spacing.sm,
        flexDirection: "row",
        gap: theme.spacing.xs,
        alignItems: "center",
      }}
      testID="encumbrance-card"
    >
      <View style={{ gap: theme.spacing.xs }}>
        <Badge
          tone={determineEncumbranceTone(
            totalCarriedWeight,
            character.data.max_encumbrance,
          )}
          text="Encumbrance"
        />
        <ThemedText
          variant="caption"
          style={{ color: theme.colors.text, fontVariant: ["tabular-nums"] }}
        >
          Carrying: {totalCarriedWeight}/{character.data.max_encumbrance}
        </ThemedText>
      </View>
      <AntDesign name="right" color={theme.colors.textMuted} />
    </View>
  );
};

export default Carrying;
