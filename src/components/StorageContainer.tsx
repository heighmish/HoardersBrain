import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { itemsTable, Storage } from "@/db/schema";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useDatabase } from "@/db/DatabaseProvider";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import ItemComponent from "./ItemComponent";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";

interface StorageContainerProps {
  storage: Storage;
  showWeight?: boolean;
}

const StorageContainer: React.FC<StorageContainerProps> = ({
  storage,
  showWeight = true,
}) => {
  const theme = useTheme();
  const db = useDatabase();
  const items = useLiveQuery(
    db.query.itemsTable.findMany({
      where: and(
        eq(itemsTable.storage_location_id, storage.storage_location_id),
        isNull(itemsTable.deleted_at),
      ),
    }),
    [storage.storage_location_id],
  );

  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? items.data : items.data.slice(0, 5);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadows.card,
        borderRadius: theme.radius.lg,
        borderCurve: "continuous",
        padding: theme.spacing.md,
      }}
      testID={`container-card-${storage.storage_location_id}`}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: theme.spacing.xs,
        }}
      >
        <ThemedText variant="headline">{storage.name} </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Container options"
          onPress={() => {
            router.push({
              pathname: "/ContainerMenuSheet",
              params: {
                storageId: storage.storage_location_id,
              },
            });
          }}
          style={({ pressed }) => ({
            padding: theme.spacing.sm,
            margin: -theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
          testID={`container-menu-${storage.storage_location_id}`}
        >
          <AntDesign name="ellipsis" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderColor: theme.colors.border,
          marginBottom: theme.spacing.sm,
        }}
      >
        <View style={{ flex: 7 }}>
          <ThemedText variant="subhead">Name</ThemedText>
        </View>
        <View
          style={{
            flexDirection: "row",
            flex: 3,
            gap: theme.spacing.md,
            justifyContent: "flex-end",
          }}
        >
          <ThemedText variant="subhead">Qty</ThemedText>
          {showWeight ? (
            <ThemedText variant="subhead">Weight</ThemedText>
          ) : null}
        </View>
      </View>
      {items.data.length === 0 ? (
        <ThemedText variant="subhead">No items</ThemedText>
      ) : (
        <View>
          {visibleItems.map((item) => (
            <ItemComponent
              key={item.item_id}
              item={item}
              showWeight={showWeight}
            />
          ))}
        </View>
      )}
      {items.data.length > 5 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? "Show fewer items" : "Show all items"}
          onPress={() => {
            setExpanded((prev) => !prev);
          }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            alignSelf: "flex-start",
            paddingVertical: theme.spacing.xs,
          })}
          testID={`container-expand-${storage.storage_location_id}`}
        >
          <ThemedText variant="subhead">
            {expanded ? "Show fewer" : `Show all (${items.data.length})`}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
};

export default StorageContainer;
