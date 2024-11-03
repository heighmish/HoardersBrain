import { StyleSheet } from "react-native";
import Colors from "@/constants/Colors";

export const defaultStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 40,
    fontWeight: "700",
  },
  pillButton: {
    padding: 10,
    height: 60,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  textLink: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "500",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "500",
  },
  pillButtonSmall: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "grey",
    borderRadius: 10,
    color: Colors.textLight,
    height: 40,
    width: "50%",
  },
  buttonTextSmall: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 30,
    fontWeight: "bold",
    marginVertical: 20,
    marginBottom: 10,
  },
  block: {
    marginHorizontal: 20,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    gap: 20,
  },
});
