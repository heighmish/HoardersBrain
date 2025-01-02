import { Rarity } from "@/constants/databaseTypes";
import { Colours, defaultStyles } from "@/constants/Styles";
import { Text, View } from "react-native";

type SupportedColours = "success" | "warning" | "error" | Rarity;

interface BadgeProps {
  text: string;
  colour: SupportedColours;
  filled?: boolean;
}

const getColour = (colour: SupportedColours) => {
  switch (colour) {
    case "success":
      return Colours.success;
    case "warning":
      return Colours.warning;
    case "error":
      return Colours.error;
    case "Common":
      return Colours.common;
    case "Uncommon":
      return Colours.uncommon;
    case "Rare":
      return Colours.rare;
    case "Very Rare":
      return Colours.veryRare;
    case "Legendary":
      return Colours.legendary;
    default:
      return Colours.primary;
  }
};

const Badge: React.FC<BadgeProps> = ({ text, colour, filled = true }) => {
  const mappedColour = getColour(colour);
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
