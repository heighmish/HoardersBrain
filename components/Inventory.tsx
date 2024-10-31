import React from "react";
import { Text, View } from "react-native";
import { Character } from "../db/schema";

interface InventoryProps {
  character: Character;
}

const Inventory: React.FC<InventoryProps> = ({ character }) => {
  return (
    <View>
      <Text>{character.name}</Text>
      <Text>Copper: {character.copper}</Text>
      <Text>Silver: {character.silver}</Text>
      <Text>Gold: {character.gold}</Text>
      <Text>Platinum: {character.platinum}</Text>
    </View>
  );
};

export default Inventory;
