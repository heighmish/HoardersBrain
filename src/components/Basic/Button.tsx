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

  const sizeStyles =
    size === "md"
      ? {
          minHeight: theme.layout.controlMd,
          paddingHorizontal: theme.spacing.lg,
          type: theme.type.headline,
        }
      : {
          minHeight: theme.layout.controlSm,
          paddingHorizontal: theme.spacing.md,
          type: { ...theme.type.subhead, fontWeight: "600" as const },
        };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      hitSlop={size === "sm" ? 4 : undefined}
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
          opacity: disabled
            ? theme.opacity.disabled
            : pressed
              ? theme.opacity.pressed
              : 1,
          minHeight: sizeStyles.minHeight,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: theme.spacing.xs,
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
