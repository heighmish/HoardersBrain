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
    <View style={[styles.group, { borderColor: theme.colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrement"
        testID="numeric-decrement"
        onPressIn={buttonDecrement}
        style={({ pressed }) => [
          styles.numberButton,
          styles.numberButtonLeft,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text
          style={[styles.numberButtonText, { color: theme.colors.accent }]}
        >
          -
        </Text>
      </Pressable>
      <TextInput
        style={[
          styles.numberField,
          {
            borderColor: theme.colors.border,
            color: theme.colors.text,
          },
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
          styles.numberButtonRight,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text
          style={[styles.numberButtonText, { color: theme.colors.accent }]}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
  },
  numberButton: {
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
    height: 44,
  },
  numberButtonLeft: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  numberButtonRight: {
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  numberButtonText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  numberField: {
    textAlign: "center",
    flex: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    fontSize: 17,
  },
});

export default NumericInput;
