import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { deleteStorageContainer } from "@/components/storageLifecycle";
import { useDatabase } from "@/db/DatabaseProvider";
import { storageLocationsTable } from "@/db/schema";
import { useTheme } from "@/stores/ThemeContext";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";

const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const ContainerMenuSheet = () => {
  const { storageId } = useLocalSearchParams<{ storageId?: string }>();
  const parsed = parseIdParam(storageId);

  if (parsed === null) {
    return null;
  }

  return <SheetContent storageId={parsed} />;
};

const SheetContent = ({ storageId }: { storageId: number }) => {
  const theme = useTheme();
  const db = useDatabase();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const storage = useLiveQuery(
    db.query.storageLocationsTable.findFirst({
      where: and(
        eq(storageLocationsTable.storage_location_id, storageId),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [storageId],
  );

  if (storage.error || storage.updatedAt === undefined || storage.data === undefined) {
    return null;
  }

  const container = storage.data;
  const confirmMatches = confirmText.trim() === container.name.trim();

  const closeSheet = () => {
    router.dismiss();
  };

  const deleteContainer = () => {
    if (!confirmMatches) {
      return;
    }
    deleteStorageContainer(db, container);
    closeSheet();
  };

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

  if (confirming) {
    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
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
          placeholder={container.name}
          testID="delete-confirm-input"
        />
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setConfirming(false)}
            testID="delete-cancel-button"
          />
          <Button
            title="Delete"
            onPress={deleteContainer}
            disabled={!confirmMatches}
            testID="delete-confirm-button"
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        gap: theme.spacing.xs,
      }}
    >
      <ThemedText variant="headline">{container.name}</ThemedText>
      {menuRow(
        "Edit",
        () => {
          closeSheet();
          router.push({
            pathname: "/CreateStorageForm",
            params: {
              storageId: container.storage_location_id,
            },
          });
        },
        `container-edit-action-${container.storage_location_id}`,
      )}
      {menuRow(
        "Delete",
        () => setConfirming(true),
        `container-delete-action-${container.storage_location_id}`,
        true,
      )}
    </View>
  );
};

export default ContainerMenuSheet;
