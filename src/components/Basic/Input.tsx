import { useTheme } from "@/stores/ThemeContext";
import { TextInput, TextInputProps } from "react-native";

const Input: React.FC<TextInputProps> = ({ style, ...props }) => {
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.colors.textMuted}
      {...props}
      style={[
        {
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          borderCurve: "continuous",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        },
        theme.type.body,
        style,
      ]}
    />
  );
};

export default Input;
