import { StyleSheet } from "react-native";

export const Spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
  xll: 48,
};

export const tintColorLight = "#0a7ea4";

export const Colours = {
  text: "#11181C",
  textLight: "#fff",
  textPlaceholderLight: "#fff",
  background: "#fff",
  tint: tintColorLight,
  icon: "#687076",
  tabIconDefault: "#687076",
  tabIconSelected: tintColorLight,
  lightGray: "#D8DCE2",
  gray: "#626D77",
  primary: "#C9C8FA",
  success: "green",
  warning: "yellow",
  error: "red",
};
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
  inputLabel: {
    fontSize: 16,
    fontWeight: "bold",
  },
  textInput: {
    backgroundColor: Colours.lightGray,
    padding: Spacing.l,
    borderRadius: 16,
    fontSize: 20,
  },
  textInputSmall: {
    borderWidth: 1,
    borderColor: Colours.lightGray,
    padding: Spacing.s,
    borderRadius: 5,
    fontSize: 16,
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
  badge: {
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
  },
  input: {
    borderColor: Colours.lightGray,
    borderWidth: 1,
  },
  card: {
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});
