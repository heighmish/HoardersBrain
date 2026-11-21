import { ThemeTypography } from "@/constants/theme";
import { useTheme } from "@/stores/ThemeContext";
import { Text, TextProps } from "react-native";

interface ThemedTextProps extends TextProps {
  variant?: keyof ThemeTypography;
}

const ThemedText: React.FC<ThemedTextProps> = ({
  variant = "body",
  style,
  ...props
}) => {
  const theme = useTheme();

  return <Text {...props} style={[theme.type[variant], style]} />;
};

export default ThemedText;
