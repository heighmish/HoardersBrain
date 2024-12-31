import React from "react";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CharacterProvider } from "@/stores/CharacterContext";
import { useWindowDimensions } from "react-native";

export default function RootLayout() {
  const { height } = useWindowDimensions();
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
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="changeCharacterSheet"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: height < 700 ? [0.22] : "fitToContents",
              sheetGrabberVisible: true,
              sheetExpandsWhenScrolledToEdge: true,
              sheetCornerRadius: 15,
            }}
          />
          <Stack.Screen
            name="updateCurrencySheet"
            options={{
              presentation: "formSheet",
              headerShown: false,
              sheetAllowedDetents: "fitToContents",
              sheetGrabberVisible: false,
              sheetExpandsWhenScrolledToEdge: true,
              sheetCornerRadius: 15,
            }}
          />
        </Stack>
      </CharacterProvider>
    </DatabaseProvider>
  );
}
