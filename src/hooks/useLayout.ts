import { useWindowDimensions } from "react-native";

export interface LayoutMetrics {
  fontScale: number;
  isCompactWidth: boolean;
  isLargeText: boolean;
}

export const useLayout = (): LayoutMetrics => {
  const { width, fontScale } = useWindowDimensions();
  return {
    fontScale,
    isCompactWidth: width < 380,
    isLargeText: fontScale >= 1.3,
  };
};
