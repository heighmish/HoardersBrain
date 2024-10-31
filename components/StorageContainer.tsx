import { Storage } from "@/db/schema";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface StorageContainerProps {
  storage: Storage;
}
const StorageContainer: React.FC<StorageContainerProps> = ({ storage }) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text>{storage.name} </Text>
        <View style={{ display: "flex", flexDirection: "row" }}>
          <Text>{storage.weight} </Text>
          <Text>{storage.rarity} </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 30,
    padding: 8,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default StorageContainer;
