import React, { Component, ErrorInfo, ReactNode } from "react";
import { View } from "react-native";
import { DatabaseProvider } from "@/db/DatabaseProvider";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CharacterProvider } from "@/stores/CharacterContext";
import {
  ThemeProvider as AppThemeProvider,
  useTheme,
} from "@/stores/ThemeContext";
import { useWindowDimensions } from "react-native";
import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";

const RootNavigator = () => {
  const theme = useTheme();
  const { height } = useWindowDimensions();
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
            sheetCornerRadius: 15,
          }}
        />
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
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <ErrorBoundary>
        <SafeAreaProvider>
          <DatabaseProvider>
            <CharacterProvider>
              <RootNavigator />
            </CharacterProvider>
          </DatabaseProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </AppThemeProvider>
  );
}
