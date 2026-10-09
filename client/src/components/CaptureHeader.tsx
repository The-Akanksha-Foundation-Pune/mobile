import { ReactNode, useMemo } from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { captureLayout, captureLight, captureType } from "../theme/capture";

/** Subtitles are hidden for now; flip this back on to show them under the title. */
const SHOW_SUBTITLE = false;

type CaptureHeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  /** Brand mark shown in the left slot on root screens (used when there is no back button). */
  logo?: ImageSourcePropType;
  /** Replaces the default bell button. */
  right?: ReactNode;
  onNotifications?: () => void;
  /** Unread count shown as a badge on the bell. */
  notificationCount?: number;
  /** Shows a ⋮ button after the bell. */
  onMore?: () => void;
};

/** Top bar from the Stitch design: back, title, bell and ⋮ menu. */
export function CaptureHeader({
  title = "CaptureAkanksha",
  subtitle = "Events, posts & student stories",
  onBack,
  logo,
  right,
  onNotifications,
  notificationCount = 0,
  onMore,
}: CaptureHeaderProps) {
  const styles = useMemo(() => getStyles(), []);
  const c = captureLight;

  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={6}
          >
            <MaterialIcons name="arrow-back" size={24} color={c.onSurface} />
          </Pressable>
        ) : logo ? (
          <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Akanksha" />
        ) : null}
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {SHOW_SUBTITLE && subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.actions}>
        {right !== undefined ? (
          right
        ) : (
          <>
            <Pressable
              onPress={onNotifications}
              style={({ pressed }) => [styles.bellBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : "Notifications"}
            >
              <MaterialCommunityIcons name="bell-outline" size={22} color={c.onSurfaceVariant} />
              {notificationCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{notificationCount > 9 ? "9+" : notificationCount}</Text>
                </View>
              ) : null}
            </Pressable>
            {onMore ? (
              <Pressable
                onPress={onMore}
                style={({ pressed }) => [styles.moreBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="More options"
              >
                <MaterialCommunityIcons name="dots-vertical" size={22} color={c.onSurfaceVariant} />
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

function getStyles() {
  const c = captureLight;
  return StyleSheet.create({
    bar: {
      height: captureLayout.headerHeight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: captureLayout.gutter,
      backgroundColor: c.surface,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
    },
    left: { flex: 1, flexDirection: "row", alignItems: "center", gap: captureLayout.space.sm },
    titles: { flex: 1, justifyContent: "center" },
    title: { ...captureType.headlineSm, color: c.onSurface },
    subtitle: { ...captureType.bodySm, lineHeight: 14, color: c.onSurfaceVariant },
    actions: { flexDirection: "row", alignItems: "center", gap: captureLayout.space.xs },
    backBtn: {
      width: 40,
      height: 40,
      marginLeft: -4,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    logo: { width: 64, height: 28, marginLeft: -2 },
    bellBtn: {
      width: captureLayout.touchTarget,
      height: captureLayout.touchTarget,
      borderRadius: captureLayout.touchTarget / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: 8,
      right: 8,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      borderRadius: 8,
      borderWidth: 1.5,
      borderColor: c.surface,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { ...captureType.labelSm, fontSize: 9, lineHeight: 11, letterSpacing: 0, color: c.onPrimary },
    moreBtn: {
      width: 40,
      height: captureLayout.touchTarget,
      marginRight: -8,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { backgroundColor: c.surfaceContainer },
  });
}
