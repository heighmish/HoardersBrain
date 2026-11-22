import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { ActivityIndicator, View } from "react-native";

interface ScreenStateProps {
  kind: "loading" | "message";
  message?: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTestID?: string;
}

const ScreenState: React.FC<ScreenStateProps> = ({
  kind,
  message,
  title,
  actionLabel,
  onAction,
  actionTestID,
}) => {
  const theme = useTheme();

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="screen-state"
    >
      {title !== undefined && <AppHeader title={title} />}
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        {kind === "loading" ? (
          <ActivityIndicator
            color={theme.colors.accent}
            testID="screen-state-loading"
          />
        ) : (
          message !== undefined && (
            <ThemedText
              variant="body"
              style={{ color: theme.colors.textMuted, textAlign: "center" }}
              testID="screen-state-message"
            >
              {message}
            </ThemedText>
          )
        )}
        {actionLabel !== undefined && onAction !== undefined && (
          <Button
            title={actionLabel}
            variant="secondary"
            onPress={onAction}
            testID={actionTestID}
          />
        )}
      </View>
    </View>
  );
};

export default ScreenState;
