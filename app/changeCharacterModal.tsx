import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { Spacing, defaultStyles } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { useCharacterContext } from "@/stores/CharacterContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "@/components/Modal"; // Might need to add change status bar appearance for IOS https://docs.expo.dev/router/advanced/modals/

// Might need to add change status bar appearance for IOS https://docs.expo.dev/router/advanced/modals/
const ChangeCharacterModal = () => {
  const db = useDatabase();
  const characters = useLiveQuery(db.query.charactersTable.findMany());
  const characterContext = useCharacterContext();

  return (
    <Modal>
      {characters.data.length === 0 ? (
        <Text>Failed to load characters</Text>
      ) : (
        <FlatList
          style={{ paddingEnd: Spacing.m }}
          contentContainerStyle={{ gap: Spacing.l }}
          data={characters.data}
          ListFooterComponent={() => (
            <Pressable
              style={[
                defaultStyles.pillButtonSmall,
                { backgroundColor: "red" },
              ]}
            >
              <Text>CreateCharacter</Text>
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
    </Modal>
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
export default ChangeCharacterModal;
