import { AntDesign } from "@expo/vector-icons";
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
    <ScrollView
      style={{ backgroundColor: theme.colors.surface }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.md,
        paddingTop: theme.spacing.xl,
        gap: theme.spacing.lg,
      }}
    >
      <ThemedText variant="title">Settings</ThemedText>

      <View style={{ gap: theme.spacing.xs }}>
        {subhead("Character customization")}
        {linkRow(
          "dashboard",
          "Encumbrance & weight",
          "settings-encumbrance-row",
          () => {
            router.dismiss();
            router.push("/CharacterSettings");
          },
        )}
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        {subhead("App customization")}
        {linkRow("skin", "Theme", "settings-theme-row", () => {
          router.dismiss();
          router.push("/ThemeSettings");
        })}
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        {subhead("Character management")}
        {linkRow(
          "team",
          "Rename or delete",
          "manage-characters-row",
          () => {
            router.dismiss();
            router.push("/ManageCharacters");
          },
        )}
      </View>
    </ScrollView>
  );
};

export default Settings;
