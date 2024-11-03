import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { defaultStyles } from "@/constants/Styles";
import Spacing from "@/constants/spacing";
import { useDatabase } from "@/db/DatabaseProvider";
import { useCharacterContext } from "@/stores/CharacterContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Stack, router } from "expo-router";
import { Text, Pressable, FlatList, View, Switch } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";

// Might need to add change status bar appearance for IOS https://docs.expo.dev/router/advanced/modals/
const ChangeCharacterModal = () => {
  const db = useDatabase();
  const characters = useLiveQuery(db.query.charactersTable.findMany());
  const characterContext = useCharacterContext();

  return (
    <Animated.View
      entering={FadeIn}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#00000040",
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Pressable
        // This button does not work
        onPress={() => {
          router.back();
          console.log("PRESSED");
        }}
      />
      <Animated.View
        entering={SlideInDown}
        style={{
          width: "100%",
          height: "auto",
          alignItems: "center",
          borderTopStartRadius: 20,
          borderTopEndRadius: 20,
          justifyContent: "center",
          backgroundColor: "white",
          position: "absolute",
          bottom: 0,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text>← Go back</Text>
        </Pressable>
        {characters.data.length === 0 ? (
          <Text>Failed to load characters</Text>
        ) : (
          <View>
            <FlatList
              data={characters.data}
              renderItem={({ item }) => (
                <Pressable
                  style={{ backgroundColor: "red" }}
                  onPress={async () => {
                    console.log("PRESSED", item.character_id);
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
                  <View
                    style={[
                      defaultStyles.flexRow,
                      {
                        paddingHorizontal: Spacing.l,
                        width: "100%",
                        justifyContent: "space-between",
                        alignContent: "center",
                        alignItems: "center",
                      },
                    ]}
                  >
                    <Text>{item.name}</Text>
                    <Switch
                      value={
                        item.character_id === characterContext.character.id
                      }
                    />
                  </View>
                </Pressable>
              )}
            />
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

export default ChangeCharacterModal;
