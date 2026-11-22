import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { softDeleteStorageContainer } from "@/db/repositories";
import { useActiveStorage } from "@/hooks/useActiveStorage";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sheetGap = {
    paddingBottom: insets.bottom + theme.spacing.lg,
  };

  const storage = useActiveStorage(storageId);

  if (
    storage.error ||
    storage.updatedAt === undefined ||
    storage.data === undefined
  ) {
    return null;
  }

  const container = storage.data;
  const confirmMatches = confirmText.trim() === container.name.trim();

  const closeSheet = () => {
    router.dismiss();
  };

  const deleteContainer = async () => {
    if (!confirmMatches || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await softDeleteStorageContainer(db, container.storage_location_id);
      closeSheet();
    } catch (error) {
      console.error(
        "[ContainerMenuSheet]: Failed to delete storage container",
        error,
      );
      setSubmitting(false);
    }
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
          ...sheetGap,
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
            disabled={submitting}
          />
          <Button
            title="Delete"
            onPress={deleteContainer}
            testID="delete-confirm-button"
            loading={submitting}
            disabled={submitting || !confirmMatches}
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
        ...sheetGap,
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
