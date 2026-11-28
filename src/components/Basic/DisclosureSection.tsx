import { AntDesign } from "@expo/vector-icons";
import { ReactNode } from "react";
import { Pressable, View } from "react-native";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";

export const SectionLabel = ({ label }: { label: string }) => (
  <ThemedText
    variant="caption"
    style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
  >
    {label}
  </ThemedText>
);

export const CardDivider = () => {
  const theme = useTheme();

  return (
    <View
      style={{
        height: theme.layout.hairline,
        backgroundColor: theme.colors.border,
      }}
    />
  );
};

export const DisclosureCard = ({ children }: { children: ReactNode }) => {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: theme.layout.hairline,
        borderRadius: theme.radius.md,
        borderCurve: "continuous",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
};

interface DisclosureRowProps {
  label: string;
  summary: string;
  highlighted?: boolean;
  isOpen: boolean;
  onPress: () => void;
  testID?: string;
}

export const DisclosureRow = ({
  label,
  summary,
  highlighted = false,
  isOpen,
  onPress,
  testID,
}: DisclosureRowProps) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: theme.layout.touchMin,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        gap: theme.spacing.sm,
        opacity: pressed ? theme.opacity.pressed : 1,
      })}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.spacing.xs,
          flexShrink: 1,
        }}
      >
        <ThemedText
          variant="subhead"
          numberOfLines={1}
          style={{
            color: highlighted ? theme.colors.accent : theme.colors.textMuted,
            flexShrink: 1,
          }}
        >
          {summary}
        </ThemedText>
        <AntDesign
          name={isOpen ? "up" : "down"}
          size={theme.layout.icon.xs}
          color={theme.colors.textMuted}
        />
      </View>
    </Pressable>
  );
};
