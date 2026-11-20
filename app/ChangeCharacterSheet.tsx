import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { Colours, Spacing, defaultStyles } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { useCharacterContext } from "@/stores/CharacterContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

const ChangeCharacterSheet = () => {
  const db = useDatabase();
  const characters = useLiveQuery(db.query.charactersTable.findMany());
  const { state, selectCharacter, clearCharacter } = useCharacterContext();

  if (characters.error) {
    return (
      <View style={[{ marginTop: Spacing.m, marginBottom: Spacing.l }]}>
        <Text>Failed to load characters</Text>
      </View>
    );
  }

  if (characters.updatedAt === undefined) {
    return null;
  }

  return (
    <View style={[{ marginTop: Spacing.m, marginBottom: Spacing.l }]}>
      <FlatList
        style={{ paddingEnd: Spacing.m }}
        contentContainerStyle={{ gap: Spacing.l }}
        data={characters.data}
        ListFooterComponent={() => (
          <Pressable
            accessibilityRole="button"
            testID="create-new-character-button"
            onPress={async () => {
              await AsyncStorage.removeItem(LAST_CHARACTER_ID);
              clearCharacter();
              router.replace("/");
            }}
            style={[
              defaultStyles.pillButtonSmall,
              { backgroundColor: Colours.primary },
            ]}
          >
            <Text>Create new character</Text>
          </Pressable>
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
            <View style={[defaultStyles.flexRow, styles.characterRow]}>
              <Text>{item.name}</Text>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor:
                      state.status === "characterSelected" &&
                      state.character.id === item.character_id
                        ? "black"
                        : "white",
                  },
                ]}
              />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  characterRow: {
    paddingHorizontal: Spacing.l,
    width: "100%",
    justifyContent: "space-between",
    alignContent: "center",
    alignItems: "center",
  },
  circle: {
    borderColor: "black",
    borderWidth: 1,
    height: 25,
    width: 25,
    borderRadius: 50,
  },
});
export default ChangeCharacterSheet;
