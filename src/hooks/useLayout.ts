import { useWindowDimensions } from "react-native";

export interface LayoutMetrics {
  width: number;
  height: number;
  fontScale: number;
  isCompactWidth: boolean;
  isLargeText: boolean;
}

export const useLayout = (): LayoutMetrics => {
  const { width, height, fontScale } = useWindowDimensions();
  return {
    width,
    height,
    fontScale,
    isCompactWidth: width < 380,
    isLargeText: fontScale >= 1.3,
  };
};
