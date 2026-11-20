import React from "react";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { CharacterProvider } from "@/stores/CharacterContext";
import { ThemeProvider, useTheme } from "@/stores/ThemeContext";
import { useWindowDimensions } from "react-native";

const RootNavigator = () => {
  const theme = useTheme();
  const { height } = useWindowDimensions();

  return (
    <>
      <StatusBar style={theme.resolvedMode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.text },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="ChangeCharacterSheet"
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
          name="UpdateCurrencySheet"
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            sheetExpandsWhenScrolledToEdge: true,
            sheetCornerRadius: 15,
          }}
        />
        <Stack.Screen
          name="ThemeSettingsSheet"
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: false,
            sheetExpandsWhenScrolledToEdge: true,
            sheetCornerRadius: 15,
          }}
        />
        <Stack.Screen
          name="CreateStorageForm"
          options={{
            headerBackTitle: "Back",
            headerTitle: "Create new storage",
          }}
        />

        <Stack.Screen
          name="CreateItemForm"
          options={{
            headerBackTitle: "Back",
            headerTitle: "Create new item",
          }}
        />
      </Stack>
    </>
  );
};

export default function RootLayout() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <CharacterProvider>
          <RootNavigator />
        </CharacterProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
