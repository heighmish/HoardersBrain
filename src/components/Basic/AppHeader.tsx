import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";

const AppHeader = ({ title }: { title: string }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        paddingTop: insets.top,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View
        style={{
          minHeight: theme.layout.touchMin,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          testID="back-button"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => ({
            opacity: pressed ? theme.opacity.pressedSubtle : 1,
          })}
        >
          <AntDesign
            name="arrow-left"
            size={theme.layout.icon.lg}
            color={theme.colors.accent}
          />
        </Pressable>
        <ThemedText variant="headline" numberOfLines={1} style={{ flex: 1 }}>
          {title}
        </ThemedText>
      </View>
    </View>
  );
};

export default AppHeader;
