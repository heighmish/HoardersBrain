import Badge from "@/components/Basic/Badge";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { useDatabase } from "@/db/DatabaseProvider";
import { itemsTable, storageLocationsTable } from "@/db/schema";
import { and, eq, isNull, sum } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { View } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { useCharacterRow } from "@/hooks/useCharacterRow";
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
  const character = useCharacterRow(characterId);

  const items = useLiveQuery(
    db
      .select()
      .from(itemsTable)
      .leftJoin(
        storageLocationsTable,
        and(
          eq(
            itemsTable.storage_location_id,
            storageLocationsTable.storage_location_id,
          ),
          isNull(storageLocationsTable.deleted_at),
        ),
      )
      .where(
        and(
          eq(itemsTable.character_id, characterId),
          isNull(itemsTable.deleted_at),
        ),
      ),
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
          isNull(storageLocationsTable.deleted_at),
        ),
      ),
    [characterId],
  );

  const carriedRows: CarriedItemRow[] = items.data.flatMap((row) => {
    const storage = row.storage_locations;

    if (storage === null) {
      return [];
    }

    return [
      {
        itemWeight: row.items.weight,
        itemQuantity: row.items.quantity,
        isFixedWeight: storage.is_fixed_weight,
        isCarrying: storage.carrying,
      },
    ];
  });

  const containerWeight = Number(
    containerWeightQuery.data[0]?.totalWeight ?? 0,
  );
  const totalCarriedWeight =
    calculateCarriedItemsWeight(carriedRows) + containerWeight;

  if (character.error || items.error || containerWeightQuery.error) {
    return (
      <View>
        <ThemedText variant="body">
          Failed to load character information
        </ThemedText>
      </View>
    );
  }

  if (
    character.data === undefined ||
    items.updatedAt === undefined ||
    containerWeightQuery.updatedAt === undefined
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
          Carrying: {totalCarriedWeight}/{character.data.max_encumbrance} lb
        </ThemedText>
      </View>
      <AntDesign name="right" color={theme.colors.textMuted} />
    </View>
  );
};

export default Carrying;
