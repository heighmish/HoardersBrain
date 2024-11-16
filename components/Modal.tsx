import { router, Stack } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import React from "react";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { Spacing } from "@/constants/Styles";

interface ModalProps {
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ children }) => {
  return (
    <Animated.View
      entering={FadeIn}
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#00000040",
      }}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          }
        }}
      />
      <Animated.View
        entering={SlideInDown}
        style={{
          display: "flex",
          flex: 1,
          width: "100%",
          height: "auto",
          maxHeight: "40%",
          alignItems: "center",
          borderTopStartRadius: 20,
          borderTopEndRadius: 20,
          backgroundColor: "white",
          position: "absolute",
          bottom: 0,
        }}
      >
        <Pressable onPress={() => router.back()}>
          <Text style={{ paddingVertical: Spacing.s }}>← Close</Text>
        </Pressable>
        {children}
      </Animated.View>
    </Animated.View>
  );
};

export default Modal;
