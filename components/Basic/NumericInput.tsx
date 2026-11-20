import { Colours, defaultStyles } from "@/constants/Styles";
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
  return (
    <View style={[defaultStyles.flexRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrement"
        testID="numeric-decrement"
        onPressIn={buttonDecrement}
        style={({ pressed }) => [
          styles.numberButton,
          {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRightWidth: 0,
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={[defaultStyles.buttonText, styles.numberButtonText]}>
          -
        </Text>
      </Pressable>
      <TextInput
        style={[
          defaultStyles.textInputSmall,
          { textAlign: "center", flex: 2, borderRadius: 0 },
        ]}
        keyboardType="numeric"
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
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderLeftWidth: 0,
          },
          pressed && { opacity: 0.6 },
        ]}
      >
        <Text style={[defaultStyles.buttonText, styles.numberButtonText]}>
          +
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  numberButton: {
    justifyContent: "center",
    flex: 1,
    borderWidth: 1,
    borderColor: Colours.lightGray,
    borderRadius: 5,
  },
  numberButtonText: { color: Colours.text, textAlign: "center" },
});

export default NumericInput;
