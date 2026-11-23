import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { createTag, softDeleteTag } from "@/db/repositories/tags";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacterTags } from "@/hooks/useCharacterTags";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { AntDesign } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";

const TagSettings = () => {
  const theme = useTheme();
  const db = useDatabase();
  const character = useSelectedCharacter();
  const allTags = useCharacterTags(character.id);

  const [name, setName] = useState("");
  const [isGlobal, setIsGlobal] = useState(false);
  const [parentTagId, setParentTagId] = useState<number | null>(null);
  const [isUsable, setIsUsable] = useState(false);

  const createAction = useAsyncAction();
  const deleteAction = useAsyncAction();

  const globalTags = allTags.filter((tag) => tag.character_id === null);
  const characterTags = allTags.filter((tag) => tag.character_id !== null);
  const parentCandidates = allTags.filter(
    (tag) =>
      tag.parent_tag_id === null && (!isGlobal || tag.character_id === null),
  );
  const effectiveParentId =
    parentTagId !== null &&
    parentCandidates.some((candidate) => candidate.tag_id === parentTagId)
      ? parentTagId
      : null;

  const handleCreate = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return;
    }

    void createAction.run(async () => {
      await createTag(db, {
        character_id: isGlobal ? null : character.id,
        name: trimmed,
        parent_tag_id: effectiveParentId,
        is_usable: isUsable,
      });
      setName("");
      setParentTagId(null);
      setIsUsable(false);
    }, "Failed to create tag.");
  };

  const handleDelete = (tagId: number) => {
    void deleteAction.run(async () => {
      await softDeleteTag(db, tagId);
    }, "Failed to delete tag.");
  };

  const sectionLabel = (label: string) => (
    <ThemedText
      variant="caption"
      style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {label}
    </ThemedText>
  );

  const renderTagList = (tags: typeof allTags) => {
    const byId = new Map(allTags.map((tag) => [tag.tag_id, tag]));
    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          borderCurve: "continuous",
          overflow: "hidden",
        }}
      >
        {tags.map((tag, index) => {
          const parent =
            tag.parent_tag_id === null ? undefined : byId.get(tag.parent_tag_id);
          return (
            <View key={tag.tag_id}>
              {index > 0 ? (
                <View
                  style={{ height: 1, backgroundColor: theme.colors.border }}
                />
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                  gap: theme.spacing.sm,
                }}
              >
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <ThemedText variant="body">{tag.name}</ThemedText>
                  {parent !== undefined ? (
                    <ThemedText variant="caption">
                      Under {parent.name}
                    </ThemedText>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${tag.name}`}
                  disabled={deleteAction.submitting}
                  onPress={() => handleDelete(tag.tag_id)}
                  style={({ pressed }) => ({
                    padding: theme.spacing.sm,
                    opacity: pressed ? 0.6 : 1,
                  })}
                  testID={`delete-tag-${tag.tag_id}`}
                >
                  <AntDesign
                    name="close"
                    size={16}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Tags" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: theme.spacing.md,
            gap: theme.spacing.lg,
          }}
        >
          <View style={{ gap: theme.spacing.sm }}>
            {sectionLabel("New tag")}
            <Input
              placeholder="Tag name"
              value={name}
              onChangeText={setName}
              testID="tag-settings-name-input"
            />

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.md,
                borderCurve: "continuous",
                overflow: "hidden",
              }}
            >
              <Pressable
                style={({ pressed }) => ({
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityRole="switch"
                accessibilityState={{ checked: isGlobal }}
                onPress={() => setIsGlobal((prev) => !prev)}
              >
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <ThemedText variant="body">Global tag</ThemedText>
                  <ThemedText variant="caption">
                    Available across all characters
                  </ThemedText>
                </View>
                <Switch
                  value={isGlobal}
                  onValueChange={setIsGlobal}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  testID="tag-global-toggle"
                />
              </Pressable>

              <View
                style={{ height: 1, backgroundColor: theme.colors.border }}
              />

              <Pressable
                style={({ pressed }) => ({
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  opacity: pressed ? 0.7 : 1,
                })}
                accessibilityRole="switch"
                accessibilityState={{ checked: isUsable }}
                onPress={() => setIsUsable((prev) => !prev)}
              >
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <ThemedText variant="body">Usable</ThemedText>
                  <ThemedText variant="caption">
                    Items with this tag can be consumed
                  </ThemedText>
                </View>
                <Switch
                  value={isUsable}
                  onValueChange={setIsUsable}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent,
                  }}
                  testID="tag-usable-toggle"
                />
              </Pressable>
            </View>

            {parentCandidates.length > 0 ? (
              <View style={{ gap: theme.spacing.xs }}>
                <ThemedText variant="caption">
                  Parent category (optional)
                </ThemedText>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: theme.spacing.xs,
                  }}
                >
                  {parentCandidates.map((candidate) => {
                    const selected = effectiveParentId === candidate.tag_id;
                    return (
                      <Pressable
                        key={`parent-${candidate.tag_id}`}
                        onPress={() =>
                          setParentTagId(selected ? null : candidate.tag_id)
                        }
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={({ pressed }) => ({
                          opacity: pressed ? 0.7 : 1,
                        })}
                      >
                        <Badge
                          text={candidate.name}
                          color={
                            selected ? theme.colors.accent : theme.colors.border
                          }
                          filled={selected}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {createAction.error !== null ? (
              <ThemedText
                variant="caption"
                style={{ color: theme.colors.error }}
              >
                {createAction.error}
              </ThemedText>
            ) : null}

            <Button
              title="Add Tag"
              onPress={handleCreate}
              loading={createAction.submitting}
              disabled={createAction.submitting || name.trim().length === 0}
              testID="tag-settings-add-button"
              fullWidth
            />
          </View>

          {globalTags.length > 0 ? (
            <View style={{ gap: theme.spacing.xs }}>
              {sectionLabel("Global tags")}
              {renderTagList(globalTags)}
            </View>
          ) : null}

          <View style={{ gap: theme.spacing.xs }}>
            {sectionLabel("Active character tags")}
            {characterTags.length === 0 ? (
              <ThemedText variant="subhead">No character tags</ThemedText>
            ) : (
              renderTagList(characterTags)
            )}
          </View>

          {deleteAction.error !== null ? (
            <ThemedText variant="caption" style={{ color: theme.colors.error }}>
              {deleteAction.error}
            </ThemedText>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default TagSettings;
