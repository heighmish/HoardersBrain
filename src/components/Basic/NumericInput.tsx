import { useTheme } from "@/stores/ThemeContext";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

interface NumericInputProps extends TextInputProps {
  buttonIncrement: () => void;
  buttonDecrement: () => void;
}

const NumericInput: React.FC<NumericInputProps> = ({
  buttonIncrement,
  buttonDecrement,
  ...props
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.group,
        { borderColor: theme.colors.border, borderRadius: theme.radius.md },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrement"
        testID="numeric-decrement"
        onPressIn={buttonDecrement}
        style={({ pressed }) => [
          styles.numberButton,
          {
            borderTopLeftRadius: theme.radius.md,
            borderBottomLeftRadius: theme.radius.md,
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text
          style={[
            styles.numberButtonText,
            theme.type.headline,
            { color: theme.colors.accent },
          ]}
        >
          -
        </Text>
      </Pressable>
      <TextInput
        style={[
          styles.numberField,
          { borderColor: theme.colors.border, color: theme.colors.text },
          theme.type.body,
        ]}
        keyboardType="numeric"
        placeholderTextColor={theme.colors.textMuted}
        {...props}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increment"
        testID="numeric-increment"
        onPressIn={buttonIncrement}
        style={({ pressed }) => [
          styles.numberButton,
          {
            borderTopRightRadius: theme.radius.md,
            borderBottomRightRadius: theme.radius.md,
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text
          style={[
            styles.numberButtonText,
            theme.type.headline,
            { color: theme.colors.accent },
          ]}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
};

// 44 is the platform minimum touch target, kept as a fixed control height.
const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    borderWidth: 1,
  },
  numberButton: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    height: 44,
  },
  numberButtonText: {
    textAlign: "center",
  },
  numberField: {
    textAlign: "center",
    flex: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
});

export default NumericInput;
