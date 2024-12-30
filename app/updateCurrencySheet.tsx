import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import AntDesign from "@expo/vector-icons/build/AntDesign";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

const UpdateCurrencySheet = () => {
  const db = useDatabase();
  const character = useCharacterContext();

  const characterQuery = useLiveQuery(
    db.query.charactersTable.findFirst({
      columns: { platinum: true, gold: true, silver: true, copper: true },
      where: eq(charactersTable.character_id, character.character.id),
    }),
    [character.character.id],
  );

  const [currencies, setCurrencies] = useState({
    platinum: characterQuery.data?.platinum ?? 0,
    gold: characterQuery.data?.gold ?? 0,
    silver: characterQuery.data?.silver ?? 0,
    copper: characterQuery.data?.copper ?? 0,
  });

  useEffect(() => {
    if (characterQuery.data) {
      setCurrencies(characterQuery.data);
    }
  }, [characterQuery.data]);

  const handleChange = (currency: string, value: string) => {
    const newValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    setCurrencies((prev) => ({
      ...prev,
      [currency]: newValue,
    }));
  };

  const saveUpdate = async () => {
    if (
      !Object.values(currencies).every((value) => Number.isNaN(value) === false)
    ) {
      console.log(
        "[UpdateCurrency] save called with an invalid value: ",
        currencies,
      );
      return;
    }

    await db
      .update(charactersTable)
      .set({
        copper: currencies.copper,
        silver: currencies.silver,
        gold: currencies.gold,
        platinum: currencies.platinum,
      })
      .where(eq(charactersTable.character_id, character.character.id));

    router.back();
  };

  if (!characterQuery.data || characterQuery.error) {
    return (
      <View>
        <Text>Failed to load currency information</Text>
      </View>
    );
  }

  return (
    <View style={[defaultStyles.container, { gap: Spacing.m }]}>
      <View style={{ display: "flex", gap: Spacing.s }}>
        {Object.entries(currencies).map((currency) => (
          <View key={`${currency[0]}-update-view`}>
            <Text
              style={defaultStyles.inputLabel}
              key={`${currency[0]}-update-label`}
            >
              {currency[0]}
            </Text>
            <TextInput
              style={defaultStyles.textInputSmall}
              keyboardType="numeric"
              placeholder={currency[0]}
              onChangeText={(text) => handleChange(currency[0], text)}
              value={currency[1].toFixed(0) || ""}
              maxLength={10}
              key={`${currency[0]}-update`}
            />
          </View>
        ))}
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <TouchableOpacity
          style={[
            defaultStyles.pillButtonSmall,
            {
              backgroundColor: Colours.primary,
              width: "30%",
              display: "flex",
              flexDirection: "row",
              gap: Spacing.xs,
            },
          ]}
          onPressIn={async () => await saveUpdate()}
        >
          <Text>Update</Text>
          <AntDesign name="arrowright" size={12} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default UpdateCurrencySheet;
