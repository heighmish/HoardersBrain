import Badge, { BadgeTone } from "@/components/Basic/Badge";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  itemsTable,
  storageLocationsTable,
} from "@/db/schema";
import { and, eq, sum } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { View } from "react-native";
import { AntDesign } from "@expo/vector-icons";

interface CarryingProps {
  characterId: number;
}

const determineEncumbranceTone = (
  carrying: number,
  maxEncumbrance: number,
): BadgeTone => {
  if (carrying >= maxEncumbrance * 1.5) {
    return "error";
  }
  if (carrying >= maxEncumbrance) {
    return "warning";
  }
  return "success";
};

const Carrying: React.FC<CarryingProps> = ({ characterId }) => {
  const theme = useTheme();
  const db = useDatabase();
  const maxEncumbrance = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterId),
      columns: { max_encumbrance: true, weight_tracking: true },
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

  const containerWeight = Number(
    containerWeightQuery.data[0]?.totalWeight ?? 0,
  );

  const itemsWeight = items.data.reduce((total, data) => {
    if (
      data.storage_locations?.carrying === false ||
      data.storage_locations?.is_fixed_weight === true
    ) {
      return total;
    }

    return total + data.items.weight;
  }, 0);

  const totalCarriedWeight = itemsWeight + containerWeight;

  if (maxEncumbrance.error || items.error || containerWeightQuery.error) {
    return (
      <View>
        <ThemedText variant="body">Failed to load character information</ThemedText>
      </View>
    );
  }

  if (
    maxEncumbrance.data === undefined ||
    items.updatedAt === undefined ||
    containerWeightQuery.updatedAt === undefined
  ) {
    return null;
  }

  if (maxEncumbrance.data.weight_tracking === false) {
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
            maxEncumbrance.data.max_encumbrance,
          )}
          text="Encumbrance"
        />
        <ThemedText
          variant="caption"
          style={{ color: theme.colors.text, fontVariant: ["tabular-nums"] }}
        >
          Carrying: {totalCarriedWeight}/{maxEncumbrance.data.max_encumbrance}{" "}
          lb
        </ThemedText>
      </View>
      <AntDesign name="right" color={theme.colors.textMuted} />
    </View>
  );
};

export default Carrying;
