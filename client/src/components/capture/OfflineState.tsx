import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CaptureButton } from "./CaptureButton";
import { useRetryConnection } from "../../hooks/useConnection";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  /** "offline" when the server cannot be reached, "slow" when it timed out or is very slow. */
  variant?: "offline" | "slow";
  /** Extra work after the connection check, e.g. reload the screen's data. */
  onRetry?: () => void | Promise<void>;
};

/** Full-area placeholder for a screen that has nothing to show because the network failed. */
export function OfflineState({ variant = "offline", onRetry }: Props) {
  const { c, type } = useCaptureTheme();
  const { retrying, retry } = useRetryConnection();
  const offline = variant === "offline";

  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: offline ? c.surfaceContainerHigh : "#FEF0C7" }]}>
        <MaterialCommunityIcons name={offline ? "wifi-off" : "wifi-strength-1-alert"} size={36} color={offline ? c.onSurfaceVariant : c.pendingText} />
      </View>
      <Text style={[type.headlineSm, styles.center, { color: c.onSurface }]}>{offline ? "You're offline" : "Connection is slow"}</Text>
      <Text style={[type.bodyMd, styles.center, { color: c.onSurfaceVariant }]}>
        {offline
          ? "Check your Wi-Fi or mobile data, then try again."
          : "This is taking longer than usual. You can wait or try again."}
      </Text>
      <CaptureButton
        label={retrying ? "Checking..." : "Try again"}
        icon="refresh"
        loading={retrying}
        onPress={async () => {
          await retry();
          await onRetry?.();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 280, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  center: { textAlign: "center", maxWidth: 300 },
});
