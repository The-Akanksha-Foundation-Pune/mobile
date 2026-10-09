import { ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { maxHeight: "85%", paddingTop: 12 },
  handle: { alignSelf: "center", width: 48, height: 6, borderRadius: 999, marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 },
  titles: { flex: 1, gap: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
