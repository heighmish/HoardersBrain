import { readableTextColor } from "@/constants/theme";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { View } from "react-native";

export type BadgeTone = "success" | "warning" | "error";

interface BadgeProps {
  text: string;
  tone?: BadgeTone;
  color?: string;
  filled?: boolean;
  testID?: string;
}

const Badge: React.FC<BadgeProps> = ({
  text,
  tone,
  color,
  filled = true,
  testID,
}) => {
  const theme = useTheme();
  const fillColor =
    tone !== undefined
      ? theme.colors[tone]
      : (color ?? theme.colors.accent);

  return (
    <View
      testID={testID}
      style={{
        backgroundColor: filled ? fillColor : "transparent",
        borderColor: fillColor,
        borderWidth: 1,
        borderRadius: theme.radius.full,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        alignSelf: "flex-start",
      }}
    >
      <ThemedText
        variant="subhead"
        style={{
          color: filled ? readableTextColor(fillColor) : theme.colors.text,
          fontWeight: "600",
        }}
      >
        {text}
      </ThemedText>
    </View>
  );
};

export default Badge;
