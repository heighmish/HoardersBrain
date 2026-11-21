import { readableTextColor } from "@/constants/theme";
import { useTheme } from "@/stores/ThemeContext";
import { Text, View } from "react-native";

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
      <Text
        style={{
          color: filled ? readableTextColor(fillColor) : theme.colors.text,
          fontSize: theme.type.subhead.fontSize,
          fontWeight: "600",
        }}
      >
        {text}
      </Text>
    </View>
  );
};

export default Badge;
