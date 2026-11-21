import { ThemeColors } from "@/constants/theme";
import { useTheme } from "@/stores/ThemeContext";
import {
  Pressable,
  StyleProp,
  Text,
  ViewStyle,
} from "react-native";

type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  testID?: string;
  disabled?: boolean;
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

const buildSizeStyles = (size: ButtonSize) =>
  size === "md"
    ? { height: 50, paddingHorizontal: 24, fontSize: 17 }
    : { height: 36, paddingHorizontal: 16, fontSize: 15 };

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  testID,
  disabled = false,
  fullWidth = false,
  style,
}) => {
  const theme = useTheme();
  const variantStyles = buildVariantStyles(theme.colors, variant);
  const sizeStyles = buildSizeStyles(size);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
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
      <Text
        style={{
          color: variantStyles.textColor,
          fontSize: sizeStyles.fontSize,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
};

export default Button;
