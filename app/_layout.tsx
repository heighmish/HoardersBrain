import React from "react";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CharacterProvider } from "@/stores/CharacterContext";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <CharacterProvider>
        <StatusBar style="dark" />
        <Stack>
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="[characterId]/inventory" />
          <Stack.Screen
            name="changeCharacterModal"
            options={{ presentation: "transparentModal" }}
          />
        </Stack>
      </CharacterProvider>
    </DatabaseProvider>
  );
}
