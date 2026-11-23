import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";
import { useActiveCharacters } from "@/hooks/useActiveCharacters";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

const ChangeCharacterSheet = () => {
  const theme = useTheme();
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
    <View
      style={{
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      <View style={{ gap: theme.spacing.md }}>
        {characters.data.map((item) => (
          <Pressable
            key={item.character_id}
            accessibilityRole="button"
            testID={`character-row-${item.character_id}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText variant="body">{item.name}</ThemedText>
              {state.status === "characterSelected" &&
                state.character.id === item.character_id && (
                  <AntDesign
                    name="check"
                    size={18}
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
      </View>
    </View>
  );
};

export default ChangeCharacterSheet;
