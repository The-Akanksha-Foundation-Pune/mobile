import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useConnectionMonitor, useRetryConnection, type ConnectionStatus } from "../../hooks/useConnection";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Shown = "offline" | "slow" | "restored";

/**
 * Slim banner pinned under the status bar. Appears when the app cannot reach the server
 * or the connection is slow, and briefly says "Back online" when it recovers.
 * Mount once at the app root.
 */
export function ConnectionBanner() {
  const { c, type, layout } = useCaptureTheme();
  const insets = useSafeAreaInsets();
  const { status } = useConnectionMonitor();
  const { retrying, retry } = useRetryConnection();
  const [shown, setShown] = useState<Shown | null>(null);
  const previous = useRef<ConnectionStatus>("checking");
  const progress = useRef(new Animated.Value(0)).current;
  // Keep the last message on screen while the banner slides away.
  const lastShown = useRef<Shown>("offline");
  if (shown) lastShown.current = shown;

  useEffect(() => {
    const before = previous.current;
    previous.current = status;
    if (status === "offline" || status === "slow") {
      setShown(status);
      return;
    }
    if (status === "online" && (before === "offline" || before === "slow")) {
      setShown("restored");
      const timer = setTimeout(() => setShown(null), 2500);
      return () => clearTimeout(timer);
    }
    if (status === "online") setShown(null);
  }, [status]);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: shown ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [shown, progress]);

  const look = {
    offline: { bg: c.inverseSurface, fg: "#fff", icon: "wifi-off" as const, text: "No internet connection", sub: "Showing what was already loaded." },
    slow: { bg: "#FEF0C7", fg: c.pendingText, icon: "wifi-strength-1-alert" as const, text: "Slow connection", sub: "Things may take longer to load." },
    restored: { bg: c.statusSuccess, fg: "#fff", icon: "wifi-check" as const, text: "Back online", sub: "" },
  }[shown ?? lastShown.current];

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });

  return (
    <Animated.View
      pointerEvents={shown ? "box-none" : "none"}
      style={[styles.wrap, { top: insets.top + 6, opacity: progress, transform: [{ translateY }] }]}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={[styles.banner, { backgroundColor: look.bg, borderRadius: layout.radius.md }]}
      >
        <MaterialCommunityIcons name={look.icon} size={18} color={look.fg} />
        <View style={styles.text}>
          <Text style={[type.labelMd, { color: look.fg }]} numberOfLines={1}>
            {look.text}
          </Text>
          {look.sub ? (
            <Text style={[type.bodySm, { color: look.fg, opacity: 0.85 }]} numberOfLines={1}>
              {look.sub}
            </Text>
          ) : null}
        </View>
        {shown === "offline" || shown === "slow" ? (
          <Pressable
            onPress={() => void retry()}
            disabled={retrying}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
            style={[styles.retry, { borderColor: look.fg, borderRadius: layout.radius.full }]}
          >
            {retrying ? (
              <ActivityIndicator size="small" color={look.fg} />
            ) : (
              <Text style={[type.labelSm, { color: look.fg, fontSize: 11 }]}>Retry</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 12, right: 12, zIndex: 1000, elevation: 20 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#101828",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { flex: 1 },
  retry: { borderWidth: 1, paddingHorizontal: 10, height: 26, minWidth: 56, alignItems: "center", justifyContent: "center" },
});
