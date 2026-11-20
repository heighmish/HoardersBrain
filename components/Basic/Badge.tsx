import { Rarity } from "@/constants/databaseTypes";
import { Colours, defaultStyles } from "@/constants/Styles";
import { Text, View } from "react-native";

export type SupportedColours = "success" | "warning" | "error" | Rarity;

interface BadgeProps {
  text: string;
  colour: SupportedColours;
  filled?: boolean;
}

const colourMap: Record<SupportedColours, string> = {
  success: Colours.success,
  warning: Colours.warning,
  error: Colours.error,
  Common: Colours.common,
  Uncommon: Colours.uncommon,
  Rare: Colours.rare,
  "Very Rare": Colours.veryRare,
  Legendary: Colours.legendary,
};

const Badge: React.FC<BadgeProps> = ({ text, colour, filled = true }) => {
  const mappedColour = colourMap[colour];
  return (
    <View
      style={[
        defaultStyles.badge,
        {
          borderColor: mappedColour,
          borderWidth: 1,
          backgroundColor: filled ? mappedColour : Colours.background,
        },
      ]}
    >
      <Text
        style={{
          color: filled ? Colours.textLight : Colours.text,
          fontWeight: "bold",
        }}
      >
        {text}
      </Text>
    </View>
  );
};

export default Badge;
