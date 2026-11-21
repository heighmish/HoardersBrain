import { AntDesign } from "@expo/vector-icons";
import AppHeader from "@/components/Basic/AppHeader";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import ThemedText from "@/components/Basic/ThemedText";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import type { ComponentProps } from "react";

const Settings = () => {
  const theme = useTheme();
  const { state } = useCharacterContext();

  if (state.status !== "characterSelected") {
    return null;
  }

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
      <AntDesign name="right" size={16} color={theme.colors.textMuted} />
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
    </ScrollView>
    </View>
  );
};

export default Settings;
