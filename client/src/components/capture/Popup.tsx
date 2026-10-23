import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CaptureButton, type CaptureButtonVariant } from "./CaptureButton";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type PopupTone = "info" | "success" | "warning" | "danger";

export type PopupAction = {
  label: string;
  onPress?: () => void;
  /** Visual weight; defaults to primary for the last action and secondary for the rest. */
  variant?: CaptureButtonVariant;
};

export type PopupProps = {
  visible: boolean;
  title: string;
  message?: string;
  tone?: PopupTone;
  /** Overrides the tone's icon. */
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Buttons, left to right. One button is the common case; two for confirmations. */
  actions?: PopupAction[];
  /** Called after any action, on backdrop tap and on the Android back button. */
  onClose: () => void;
  /** Tapping outside closes the popup. Off for confirmations you must answer. */
  dismissible?: boolean;
  /** Custom content below the message (a form field, a list). */
  children?: React.ReactNode;
};

const TONE_ICON: Record<PopupTone, keyof typeof MaterialCommunityIcons.glyphMap> = {
  info: "information-outline",
  success: "check-circle-outline",
  warning: "alert-outline",
  danger: "alert-circle-outline",
};

/** Centred dialog on a dimmed backdrop: tone icon, title, message, and one or two buttons. */
export function Popup({ visible, title, message, tone = "info", icon, actions, onClose, dismissible = true, children }: PopupProps) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 160,
      easing: visible ? Easing.out(Easing.back(1.2)) : Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  if (!mounted) return null;

  const toneColor = { info: c.statusInfo, success: c.statusSuccess, warning: c.statusWarning, danger: c.statusDanger }[tone];
  const toneBg = { info: "rgba(2,106,162,0.12)", success: "rgba(3,152,85,0.12)", warning: "rgba(247,144,9,0.14)", danger: "rgba(217,45,32,0.12)" }[tone];
  const buttons: PopupAction[] = actions && actions.length > 0 ? actions : [{ label: "OK" }];
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

  function run(action: PopupAction) {
    onClose();
    action.onPress?.();
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={dismissible ? onClose : undefined}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(16,24,40,0.55)", opacity: progress }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismissible ? onClose : undefined} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.card,
            shadow.level3,
            { backgroundColor: c.surfaceCard, borderRadius: layout.radius.lg, opacity: progress, transform: [{ scale }] },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: toneBg }]}>
            <MaterialCommunityIcons name={icon ?? TONE_ICON[tone]} size={28} color={toneColor} />
          </View>
          <Text style={[type.headlineSm, styles.center, { color: c.onSurface }]}>{title}</Text>
          {message ? (
            <Text style={[type.bodyMd, styles.center, { color: c.onSurfaceVariant }]}>{message}</Text>
          ) : null}
          {children ? <View style={styles.custom}>{children}</View> : null}
          <View style={[styles.actions, buttons.length > 2 && styles.actionsStacked]}>
            {buttons.map((action, index) => (
              <View key={`${action.label}-${index}`} style={styles.actionSlot}>
                <CaptureButton
                  label={action.label}
                  variant={action.variant ?? (index === buttons.length - 1 ? (tone === "danger" ? "danger" : "primary") : "secondary")}
                  onPress={() => run(action)}
                />
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 360, padding: 24, alignItems: "center", gap: 10 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  center: { textAlign: "center" },
  custom: { alignSelf: "stretch", marginTop: 4 },
  actions: { flexDirection: "row", gap: 10, alignSelf: "stretch", marginTop: 12 },
  actionsStacked: { flexDirection: "column" },
  actionSlot: { flex: 1 },
});
