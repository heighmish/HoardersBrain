import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { deleteStorageContainer } from "@/components/storageLifecycle";
import { useTheme } from "@/stores/ThemeContext";
import {
  charactersTable,
  itemsTable,
  Storage,
} from "@/db/schema";
import React, { useState } from "react";
import { FlatList, KeyboardAvoidingView, Modal, Pressable, View } from "react-native";
import { useDatabase } from "@/db/DatabaseProvider";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import ItemComponent from "./ItemComponent";
import { router } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";

interface StorageContainerProps {
  storage: Storage;
}

const StorageContainer: React.FC<StorageContainerProps> = ({ storage }) => {
  const theme = useTheme();
  const db = useDatabase();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const character = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, storage.character_id),
      columns: { weight_tracking: true },
    }),
    [storage.character_id],
  );
  const showWeight = character.data?.weight_tracking !== false;
  const items = useLiveQuery(
    db.query.itemsTable.findMany({
      where: and(
        eq(itemsTable.storage_location_id, storage.storage_location_id),
        isNull(itemsTable.deleted_at),
      ),
    }),
    [storage.storage_location_id],
  );

  const confirmMatches = confirmText.trim() === storage.name.trim();
  const closeAll = () => {
    setMenuOpen(false);
    setConfirmOpen(false);
    setConfirmText("");
  };

  const deleteContainer = () => {
    if (!confirmMatches) {
      return;
    }
    deleteStorageContainer(db, storage);
    closeAll();
  };

  const [expanded, setExpanded] = useState(false);

  const itemListHeader = (
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
  );

  const menuRow = (
    label: string,
    onPress: () => void,
    testID: string,
    destructive?: boolean,
  ) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: theme.spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
      testID={testID}
    >
      <ThemedText
        variant="body"
        style={{ color: destructive ? theme.colors.error : theme.colors.text }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );

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
          onPress={() => setMenuOpen(true)}
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
      <FlatList
        data={expanded ? items.data : items.data.slice(0, 5)}
        ListHeaderComponent={itemListHeader}
        renderItem={({ item }) => (
          <ItemComponent item={item} showWeight={showWeight} />
        )}
        keyExtractor={(item) => item.item_id.toString()}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <ThemedText variant="subhead">No items</ThemedText>
        }
        ListFooterComponent={
          items.data.length > 5 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expanded ? "Show fewer items" : "Show all items"
              }
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
          ) : undefined
        }
      />
      <Modal
        transparent
        visible={menuOpen}
        animationType="none"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={() => setMenuOpen(false)}
          style={{
            flex: 1,
            justifyContent: "flex-end",
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={{
              ...({
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              } as const),
              backgroundColor: theme.colors.scrim,
            }}
          />
          <Animated.View
            entering={SlideInDown.springify().dampingRatio(0.8)}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radius.lg,
              borderCurve: "continuous",
              padding: theme.spacing.md,
              marginBottom: theme.spacing.xl,
              marginHorizontal: theme.spacing.md,
              gap: theme.spacing.xs,
            }}
          >
            {menuRow(
              "Edit",
              () => {
                setMenuOpen(false);
                router.push({
                  pathname: "/CreateStorageForm",
                  params: {
                    storageId: storage.storage_location_id,
                  },
                });
              },
              `container-edit-action-${storage.storage_location_id}`,
            )}
            {menuRow(
              "Delete",
              () => {
                setMenuOpen(false);
                setConfirmText("");
                setConfirmOpen(true);
              },
              `container-delete-action-${storage.storage_location_id}`,
              true,
            )}
          </Animated.View>
        </Pressable>
      </Modal>
      <Modal
        transparent
        visible={confirmOpen}
        animationType="none"
        onRequestClose={closeAll}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close delete confirmation"
          onPress={closeAll}
          style={{
            flex: 1,
            justifyContent: "center",
          }}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={{
              ...({
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              } as const),
              backgroundColor: theme.colors.scrim,
            }}
          />
          <KeyboardAvoidingView behavior="padding">
            <Animated.View
              entering={FadeIn.duration(200)}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.lg,
                borderCurve: "continuous",
                padding: theme.spacing.md,
                marginHorizontal: theme.spacing.md,
                gap: theme.spacing.md,
              }}
            >
              <ThemedText variant="headline">Delete container?</ThemedText>
              <ThemedText variant="subhead">
                Type the container name to confirm.
              </ThemedText>
              <Input
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder={storage.name}
                testID="delete-confirm-input"
              />
              <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={closeAll}
                  testID="delete-cancel-button"
                />
                <Button
                  title="Delete"
                  onPress={deleteContainer}
                  disabled={!confirmMatches}
                  testID="delete-confirm-button"
                />
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
};

export default StorageContainer;
