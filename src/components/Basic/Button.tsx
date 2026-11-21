import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/stores/ThemeContext";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  Text,
  ViewStyle,
} from "react-native";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md";

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  testID?: string;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

const buildVariantStyles = (
  colors: ThemeColors,
  variant: ButtonVariant,
): { backgroundColor: string; borderColor?: string; borderWidth?: number; textColor: string } =>
  variant === "primary"
    ? { backgroundColor: colors.accent, textColor: colors.accentText }
    : {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        textColor: colors.text,
      };

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  testID,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
}) => {
  const theme = useTheme();
  const variantStyles = buildVariantStyles(theme.colors, variant);

  // 50/36 are iOS control heights, deliberately off the 4pt spacing grid
  // to clear the 44pt touch minimum; padding and type map to tokens.
  const sizeStyles =
    size === "md"
      ? {
          height: 50,
          paddingHorizontal: theme.spacing.lg,
          type: theme.type.headline,
        }
      : {
          height: 36,
          paddingHorizontal: theme.spacing.md,
          type: { ...theme.type.subhead, fontWeight: "600" as const },
        };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          borderWidth: variantStyles.borderWidth ?? 0,
          borderRadius: theme.radius.full,
          alignItems: "center",
          justifyContent: "center",
          alignSelf: fullWidth ? "stretch" : "flex-start",
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
          height: sizeStyles.height,
          paddingHorizontal: sizeStyles.paddingHorizontal,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles.textColor} />
      ) : (
        <Text style={[sizeStyles.type, { color: variantStyles.textColor }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

export default Button;
