import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { Colours, Spacing, defaultStyles } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  DEFAULT_CHARACTER,
  useCharacterContext,
} from "@/stores/CharacterContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Href, router } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ChangeCharacterSheet = () => {
  const db = useDatabase();
  const characters = useLiveQuery(db.query.charactersTable.findMany());
  const characterContext = useCharacterContext();

  return (
    <View style={[{ marginTop: Spacing.m, marginBottom: Spacing.l }]}>
      {characters.data.length === 0 ? (
        <Text>Failed to load characters</Text>
      ) : (
        <FlatList
          style={{ paddingEnd: Spacing.m }}
          contentContainerStyle={{ gap: Spacing.l }}
          data={characters.data}
          ListFooterComponent={() => (
            <Pressable
              onPress={async () => {
                await AsyncStorage.removeItem(LAST_CHARACTER_ID);
                characterContext.updateCharacter(DEFAULT_CHARACTER);
                router.replace("/" as Href);
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
            <TouchableOpacity
              onPress={async () => {
                console.log("Changing character to: ", item.character_id);
                await AsyncStorage.setItem(
                  LAST_CHARACTER_ID,
                  item.character_id.toString(),
                );
                characterContext.updateCharacter({
                  name: item.name,
                  id: item.character_id,
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
                        item.character_id === characterContext.character.id
                          ? "black"
                          : "white",
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
