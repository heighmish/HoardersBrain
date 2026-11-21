import React from "react";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
} from "expo-router";
import { CharacterProvider } from "@/stores/CharacterContext";
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
} from "@/stores/ThemeContext";
import { useWindowDimensions } from "react-native";

const RootNavigator = () => {
  const theme = useTheme();
  const { height } = useWindowDimensions();
  const baseNavTheme =
    theme.resolvedMode === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseNavTheme,
    colors: {
      ...baseNavTheme.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.error,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.accent,
          headerTitleStyle: { color: theme.colors.text },
          headerShadowVisible: false,
          statusBarStyle: theme.resolvedMode === "dark" ? "light" : "dark",
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
          name="SettingsSheet"
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
          name="CharacterSettingsSheet"
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
    </ThemeProvider>
  );
};

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <DatabaseProvider>
        <CharacterProvider>
          <RootNavigator />
        </CharacterProvider>
      </DatabaseProvider>
    </AppThemeProvider>
  );
}
