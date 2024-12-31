import { Colours, defaultStyles } from "@/constants/Styles";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
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
      <TouchableOpacity
        onPressIn={buttonDecrement}
        style={[
          styles.numberButton,
          {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
            borderRightWidth: 0,
          },
        ]}
      >
        <Text style={[defaultStyles.buttonText, styles.numberButtonText]}>
          -
        </Text>
      </TouchableOpacity>
      <TextInput
        style={[
          defaultStyles.textInputSmall,
          { textAlign: "center", flex: 2, borderRadius: 0 },
        ]}
        keyboardType="numeric"
        {...props}
      />
      <TouchableOpacity
        onPressIn={buttonIncrement}
        style={[
          styles.numberButton,
          {
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderLeftWidth: 0,
          },
        ]}
      >
        <Text style={[defaultStyles.buttonText, styles.numberButtonText]}>
          +
        </Text>
      </TouchableOpacity>
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
