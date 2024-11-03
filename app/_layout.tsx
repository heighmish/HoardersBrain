import React from "react";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="[characterId]/inventory" />
      </Stack>
    </DatabaseProvider>
  );
}
