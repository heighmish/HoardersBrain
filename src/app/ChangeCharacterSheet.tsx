import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";
import { useActiveCharacters } from "@/hooks/useActiveCharacters";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ChangeCharacterSheet = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const characters = useActiveCharacters();
  const { state, selectCharacter, clearCharacter } = useCharacterContext();

  if (characters.error) {
    return (
      <View
        style={{
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
        }}
      >
        <ThemedText variant="body">Failed to load characters</ThemedText>
      </View>
    );
  }

  if (!characters.isReady) {
    return null;
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.surface }}
      contentContainerStyle={{
        paddingTop: theme.spacing.md,
        paddingBottom: insets.bottom + theme.spacing.lg,
        paddingHorizontal: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      {characters.data.map((item) => (
        <Pressable
          key={item.character_id}
          accessibilityRole="button"
          testID={`character-row-${item.character_id}`}
          style={({ pressed }) => ({
            opacity: pressed ? theme.opacity.pressed : 1,
          })}
          onPress={() => {
            selectCharacter({
              id: item.character_id,
              name: item.name,
            });
            router.back();
          }}
        >
          <View
            style={{
              flexDirection: "row",
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              minHeight: theme.layout.touchMin,
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.spacing.sm,
            }}
          >
            <ThemedText
              variant="body"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {item.name}
            </ThemedText>
            {state.status === "characterSelected" &&
              state.character.id === item.character_id && (
                <AntDesign
                  name="check"
                  size={theme.layout.icon.md}
                  color={theme.colors.accent}
                />
              )}
          </View>
        </Pressable>
      ))}

      <Button
        title="Create new character"
        variant="secondary"
        fullWidth
        onPress={() => {
          clearCharacter();
          router.replace("/");
        }}
        testID="create-new-character-button"
      />
    </ScrollView>
  );
};

export default ChangeCharacterSheet;
