import React from "react";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: "white",
          },
        }}
      >
        <Stack.Screen name="index" />
      </Stack>
    </DatabaseProvider>
  );
}
