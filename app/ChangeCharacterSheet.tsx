import Button from "@/components/Basic/Button";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

const ChangeCharacterSheet = () => {
  const theme = useTheme();
  const db = useDatabase();
  const characters = useLiveQuery(db.query.charactersTable.findMany());
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
        <Text style={theme.type.body}>Failed to load characters</Text>
      </View>
    );
  }

  if (characters.updatedAt === undefined) {
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
      <FlatList
        contentContainerStyle={{ gap: theme.spacing.md }}
        data={characters.data}
        ListFooterComponent={() => (
          <Button
            title="Create new character"
            variant="secondary"
            fullWidth
            onPress={async () => {
              await AsyncStorage.removeItem(LAST_CHARACTER_ID);
              clearCharacter();
              router.replace("/");
            }}
            testID="create-new-character-button"
          />
        )}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            testID={`character-row-${item.character_id}`}
            onPress={async () => {
              await AsyncStorage.setItem(
                LAST_CHARACTER_ID,
                item.character_id.toString(),
              );
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
              <Text style={theme.type.body}>{item.name}</Text>
              <View
                style={{
                  backgroundColor:
                    state.status === "characterSelected" &&
                    state.character.id === item.character_id
                      ? theme.colors.accent
                      : "transparent",
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  height: 25,
                  width: 25,
                  borderRadius: 50,
                }}
              />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
};

export default ChangeCharacterSheet;
