import React, { Component, ErrorInfo, ReactNode } from "react";
import { View } from "react-native";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CharacterProvider } from "@/stores/CharacterContext";
import { InventoryDisplayProvider } from "@/stores/InventoryDisplayContext";
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
} from "@/stores/ThemeContext";
import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";

const RootNavigator = () => {
  const theme = useTheme();
  const baseNavTheme = theme.resolvedMode === "dark" ? DarkTheme : DefaultTheme;
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
          headerShown: false,
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
          name="ContainerMenuSheet"
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: true,
            sheetCornerRadius: theme.radius.lg,
          }}
        />
        <Stack.Screen
          name="ChangeCharacterSheet"
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: true,
            sheetExpandsWhenScrolledToEdge: true,
            sheetCornerRadius: theme.radius.lg,
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
            sheetCornerRadius: theme.radius.lg,
          }}
        />
        <Stack.Screen
          name="InventoryDisplaySheet"
          options={{
            presentation: "formSheet",
            headerShown: false,
            sheetAllowedDetents: "fitToContents",
            sheetGrabberVisible: true,
            sheetCornerRadius: theme.radius.lg,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
};

const ErrorFallback: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing.md,
        padding: theme.spacing.lg,
      }}
    >
      <ThemedText variant="headline">Something went wrong.</ThemedText>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  retryKey: number;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  handleRetry = () => {
    this.setState((previous) => ({
      hasError: false,
      retryKey: previous.retryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return (
      <React.Fragment key={this.state.retryKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ErrorBoundary>
        <SafeAreaProvider>
          <DatabaseProvider>
            <CharacterProvider>
              <InventoryDisplayProvider>
                <RootNavigator />
              </InventoryDisplayProvider>
            </CharacterProvider>
          </DatabaseProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </AppThemeProvider>
  );
}
