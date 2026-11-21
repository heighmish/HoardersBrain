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
          // 44 is the platform minimum touch target, kept as the fixed header height.
          height: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          testID="back-button"
          onPress={() => router.back()}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <AntDesign name="arrow-left" size={24} color={theme.colors.accent} />
        </Pressable>
        <ThemedText variant="headline">{title}</ThemedText>
      </View>
    </View>
  );
};

export default AppHeader;
