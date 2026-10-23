import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

const mark = require("../../../assets/akanksha-mark.png");

type Props = {
  message?: string;
  /** Full-screen version for app start: larger ring, bigger text. */
  splash?: boolean;
};

function usePulse(duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [value, duration]);
  return value;
}

/** The Akanksha sun mark with soft red and yellow rings pulsing out from it, like a signal. */
export function SunSpinner({ size = 72 }: { size?: number }) {
  const { c } = useCaptureTheme();
  const outer = usePulse(1600);
  const inner = usePulse(1600);
  const box = size + 20;
  const ring = { position: "absolute" as const, width: box, height: box, borderRadius: box / 2 };

  return (
    <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          ring,
          {
            backgroundColor: c.primary,
            opacity: outer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
            transform: [{ scale: outer.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] }) }],
          },
        ]}
      />
      <Animated.View
        style={[
          ring,
          {
            backgroundColor: c.secondary,
            opacity: inner.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.35, 0] }),
            transform: [{ scale: inner.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }],
          },
        ]}
      />
      <Image source={mark} resizeMode="contain" style={{ width: size * 0.62, height: size * 0.31 }} accessibilityLabel="Loading" />
    </View>
  );
}

/** Loading state for feeds and lists: the pulse spinner and a line of text, centred in the available space. */
export function ListLoader({ message = "Loading...", splash = false }: Props) {
  const { c, type } = useCaptureTheme();
  return (
    <View style={[styles.wrap, splash && { backgroundColor: c.surface }]}>
      <SunSpinner size={splash ? 88 : 56} />
      <Text style={[splash ? type.headlineSm : type.labelMd, { color: c.onSurfaceVariant }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 240, alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 24 },
});
