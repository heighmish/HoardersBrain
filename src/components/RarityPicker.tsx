import { Pressable, View } from "react-native";
import Badge from "@/components/Basic/Badge";
import { Rarity, RarityArray } from "@/constants/databaseTypes";
import { rarityColors } from "@/constants/rarity";
import { useTheme } from "@/stores/ThemeContext";

export interface RarityPickerProps {
  value: Rarity;
  onChange: (rarity: Rarity) => void;
  testIdPrefix: string;
}

const RarityPicker: React.FC<RarityPickerProps> = ({
  value,
  onChange,
  testIdPrefix,
}) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: theme.spacing.xs,
      }}
    >
      {RarityArray.map((rarity) => (
        <Pressable
          key={`${testIdPrefix}-${rarity}`}
          onPress={() => onChange(rarity)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === rarity }}
          testID={`${testIdPrefix}-${rarity}`}
          style={({ pressed }) => ({
            opacity: pressed ? theme.opacity.pressed : 1,
          })}
        >
          <Badge
            text={rarity}
            color={rarityColors[rarity]}
            filled={value === rarity}
          />
        </Pressable>
      ))}
    </View>
  );
};

export default RarityPicker;
