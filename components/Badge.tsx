import { Colours, defaultStyles } from "@/constants/Styles";
import { Text, View } from "react-native";

type SupportedColours = "success" | "warning" | "error";

interface BadgeProps {
  text: string;
  colour: SupportedColours;
}

const Badge: React.FC<BadgeProps> = ({ text, colour }) => {
  return (
    <View style={[defaultStyles.badge, { backgroundColor: Colours[colour] }]}>
      <Text style={{ color: Colours.textLight, fontWeight: "bold" }}>
        {text}
      </Text>
    </View>
  );
};

export default Badge;
