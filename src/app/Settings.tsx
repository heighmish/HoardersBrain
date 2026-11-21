import { AntDesign } from "@expo/vector-icons";
import AppHeader from "@/components/Basic/AppHeader";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, View } from "react-native";
import ThemedText from "@/components/Basic/ThemedText";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import type { ComponentProps } from "react";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { loadSampleData, SAMPLE_CHARACTER_NAME } from "@/db/sampleData";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, eq, isNull } from "drizzle-orm";

const Settings = () => {
  const theme = useTheme();
  const db = useDatabase();
  const { state } = useCharacterContext();
  const sampleCharacter = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: and(
        eq(charactersTable.name, SAMPLE_CHARACTER_NAME),
        isNull(charactersTable.deleted_at),
      ),
    }),
    [],
  );

  if (state.status !== "characterSelected") {
    return null;
  }

  const loadSample = async () => {
    const result = await loadSampleData(db);
    Alert.alert(
      result === "created" ? "Sample character created" : "Sample character reloaded",
      `Switch to ${SAMPLE_CHARACTER_NAME} from the character switcher.`,
    );
  };

  const subhead = (text: string) => (
    <ThemedText
      variant="caption"
      style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {text}
    </ThemedText>
  );

  const linkRow = (
    icon: ComponentProps<typeof AntDesign>["name"],
    label: string,
    testID: string,
    onPress: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <AntDesign name={icon} size={22} color={theme.colors.accent} />
      <ThemedText variant="body" style={{ flex: 1 }}>
        {label}
      </ThemedText>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Settings" />
      <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.md,
        gap: theme.spacing.lg,
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        {subhead("Character customization")}
        {linkRow(
          "dashboard",
          "Encumbrance & weight",
          "settings-encumbrance-row",
          () => router.push("/CharacterSettings"),
        )}
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        {subhead("App customization")}
        {linkRow("skin", "Theme", "settings-theme-row", () =>
          router.push("/ThemeSettings"),
        )}
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        {subhead("Character management")}
        {linkRow(
          "team",
          "Rename or delete",
          "manage-characters-row",
          () => router.push("/ManageCharacters"),
        )}
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        {subhead("Testing")}
        {linkRow(
          "database",
          sampleCharacter.data === undefined
            ? "Load sample data"
            : "Reload sample data",
          "settings-sample-data-row",
          () => {
            if (sampleCharacter.data === undefined) {
              void loadSample();
              return;
            }
            Alert.alert(
              "Reload sample data?",
              "The sample character's containers and items are replaced.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Reload", onPress: () => void loadSample() },
              ],
            );
          },
        )}
      </View>
    </ScrollView>
    </View>
  );
};

export default Settings;
