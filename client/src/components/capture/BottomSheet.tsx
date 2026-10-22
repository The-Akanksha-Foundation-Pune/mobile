import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

/** Bottom drawer with a handle, title row and scrollable body. */
export function BottomSheet({ visible, onClose, title, subtitle, children }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const insets = useSafeAreaInsets();
  // Animate the backdrop and the sheet separately: the dim layer fades in place while only the sheet slides.
  // (Modal's own "slide" moves the backdrop up with the sheet.)
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  const sheetOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [Dimensions.get("window").height, 0],
  });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: sheetOffset }] },
            shadow.level3,
            {
              backgroundColor: c.surfaceCard,
              borderTopLeftRadius: layout.radius.lg,
              borderTopRightRadius: layout.radius.lg,
              paddingHorizontal: layout.space.lg,
              paddingBottom: Math.max(insets.bottom, layout.space.md) + layout.space.sm,
            },
          ]}
        >
          <Pressable onPress={onClose} style={[styles.handle, { backgroundColor: c.surfaceContainerHighest }]} />
          {title ? (
            <View style={styles.titleRow}>
              <View style={styles.titles}>
                <Text style={[type.headlineSm, { color: c.onSurface }]}>{title}</Text>
                {subtitle ? <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{subtitle}</Text> : null}
              </View>
              <Pressable
                onPress={onClose}
                style={[styles.closeBtn, { backgroundColor: c.surfaceContainerHigh }]}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialCommunityIcons name="close" size={18} color={c.onSurfaceVariant} />
              </Pressable>
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  // Full width on phones; a centered panel on tablets.
  sheet: { maxHeight: "85%", paddingTop: 12, width: "100%", maxWidth: 640, alignSelf: "center" },
  handle: { alignSelf: "center", width: 48, height: 6, borderRadius: 999, marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  titles: { flex: 1, gap: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
