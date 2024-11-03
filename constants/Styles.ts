import { StyleSheet } from "react-native";
import Colours from "@/constants/Colors";
import Spacing from "@/constants/spacing";

export const defaultStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.m,
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  header: {
    fontSize: 40,
    fontWeight: "700",
  },
  pillButton: {
    padding: Spacing.m,
    height: 60,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
  },
  textLink: {
    color: Colours.text,
    fontSize: 18,
    fontWeight: "500",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  pillButtonSmall: {
    paddingHorizontal: Spacing.m,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: Colours.lightGray,
    padding: Spacing.l,
    borderRadius: 16,
    fontSize: 20,
  },
  buttonTextSmall: {
    color: Colours.textLight,
    fontSize: 16,
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 30,
    fontWeight: "bold",
    marginVertical: Spacing.l,
    marginBottom: Spacing.m,
  },
});
