import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_POLICY_URL } from "../config/constants";
import { captureFonts, captureLayout } from "../theme/capture";

type LoginScreenProps = {
  isLoading: boolean;
  canStartLogin: boolean;
  loginError?: string;
  onLoginPress: () => void;
};

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Colors from the login design (white page, crimson action, amber accents). */
const ui = {
  page: "#ffffff",
  sheet: "#f9f9ff",
  ink: "#030712",
  body: "#4b5563",
  muted: "#6b7280",
  border: "#f3f4f6",
  kicker: "#b50c08",
  kickerBg: "rgba(254,242,242,0.8)",
  inspire: "#d97706",
  button: "#d3271b",
  buttonPressed: "#b91e13",
  googleBlue: "#4285F4",
  calloutBg: "rgba(253,233,214,0.7)",
  calloutBorder: "#fed6b2",
  calloutIcon: "#b45309",
  calloutText: "#451a03",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  errorText: "#b42318",
};

const CREATIVE_SPARKS = [
  "Every frame can move a classroom.",
  "Your lens turns moments into momentum.",
  "Capture bold. Share what inspires change.",
];

const FEATURES: { icon: IconName; label: string; hint: string; bg: string; fg: string }[] = [
  { icon: "calendar-star", label: "Events", hint: "Plan & track", bg: "#fce4e4", fg: "#ef4444" },
  { icon: "camera-outline", label: "Posts", hint: "Share moments", bg: "#dcf1fd", fg: "#0ea5e9" },
  { icon: "book-open-variant", label: "Stories", hint: "Tell journeys", bg: "#fedfb6", fg: "#d97706" },
];

/** Sign-in: brand header on a white page, sign-in sheet anchored to the bottom. */
export function LoginScreen({ isLoading, canStartLogin, loginError, onLoginPress }: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const isCompact = height < 740;
  const disabled = isLoading || !canStartLogin;
  const sparkLine = CREATIVE_SPARKS[new Date().getDate() % CREATIVE_SPARKS.length];
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(intro, { toValue: 1, friction: 8, tension: 60, useNativeDriver: Platform.OS !== "web" }).start();
  }, [intro]);

  const rise = (distance: number) => ({
    opacity: intro,
    transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  return (
    <View style={styles.root}>
      <View style={[styles.glow, styles.glowAmber]} />
      <View style={[styles.glow, styles.glowRed]} />

      <ScrollView contentContainerStyle={styles.scroll} bounces={false} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.header, { paddingTop: insets.top + (isCompact ? 20 : 40) }, rise(-12)]}>
          <View style={styles.logoCard}>
            <Image source={require("../../assets/akanksha-logo.png")} style={[styles.logo, isCompact && styles.logoCompact]} resizeMode="contain" accessibilityLabel="Akanksha. Aspire. Achieve. Be the Change." />
          </View>

          <Text style={[styles.kicker, { marginTop: isCompact ? 20 : 28 }]}>CAPTUREAKANKSHA</Text>
          <Text style={[styles.headline, isCompact && styles.headlineCompact]}>
            Create. Capture.{"\n"}
            <Text style={{ color: ui.inspire }}>Inspire.</Text>
          </Text>
          <Text style={styles.subhead}>A creative space for Akanksha teams to turn real events into stories that spark action.</Text>
        </Animated.View>

        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }, rise(24)]}>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.sheetSub}>Sign in with your Akanksha Google account to continue.</Text>

          <Pressable
            onPress={onLoginPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            accessibilityState={{ disabled, busy: isLoading }}
            style={({ pressed }) => [
              styles.google,
              { backgroundColor: pressed ? ui.buttonPressed : ui.button, opacity: disabled && !isLoading ? 0.55 : 1 },
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.googleBadge}>
              {isLoading ? (
                <ActivityIndicator size="small" color={ui.button} />
              ) : (
                <MaterialCommunityIcons name="google" size={17} color={ui.googleBlue} />
              )}
            </View>
            <Text style={styles.googleLabel}>{isLoading ? "Opening Google sign-in…" : "Continue with Google"}</Text>
          </Pressable>

          {loginError ? (
            <View style={styles.error}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={ui.errorText} />
              <Text style={styles.errorText}>{loginError}</Text>
            </View>
          ) : null}

          <View style={styles.callout}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={ui.calloutIcon} />
            <Text style={styles.calloutText}>{sparkLine}</Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((feature) => (
              <View key={feature.label} style={styles.feature}>
                <View style={[styles.featureIcon, { backgroundColor: feature.bg }]}>
                  <MaterialCommunityIcons name={feature.icon} size={20} color={feature.fg} />
                </View>
                <Text style={styles.featureTitle}>{feature.label}</Text>
                <Text style={styles.featureHint} numberOfLines={1}>
                  {feature.hint}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            hitSlop={8}
            style={styles.privacy}
          >
            <Text style={styles.privacyText}>Privacy Policy</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: ui.page, overflow: "hidden" },
  glow: { position: "absolute", borderRadius: 999 },
  glowAmber: { width: 256, height: 256, top: -64, right: -64, backgroundColor: "rgba(254,243,199,0.5)" },
  glowRed: { width: 224, height: 224, top: 256, left: -64, backgroundColor: "rgba(254,226,226,0.35)" },
  scroll: { flexGrow: 1, justifyContent: "space-between", width: "100%", maxWidth: captureLayout.contentMaxWidth, alignSelf: "center" },

  header: { alignItems: "center", paddingHorizontal: 24, paddingBottom: 24 },
  logoCard: {
    width: "100%",
    maxWidth: 290,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  // Logo is 1200x636; keep that ratio.
  logo: { width: 180, height: 95 },
  logoCompact: { width: 150, height: 80 },
  kicker: {
    fontFamily: captureFonts.headExtra,
    fontSize: 11,
    letterSpacing: 2.4,
    color: ui.kicker,
    backgroundColor: ui.kickerBg,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  headline: {
    marginTop: 12,
    fontFamily: captureFonts.headExtra,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.6,
    color: ui.ink,
    textAlign: "center",
  },
  headlineCompact: { fontSize: 30, lineHeight: 36 },
  subhead: {
    marginTop: 12,
    maxWidth: 310,
    fontFamily: captureFonts.headSemi,
    fontSize: 14,
    lineHeight: 22,
    color: ui.body,
    textAlign: "center",
  },

  sheet: {
    backgroundColor: ui.sheet,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderTopWidth: 1,
    borderColor: ui.border,
    paddingHorizontal: 24,
    paddingTop: 28,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 4,
  },
  welcome: { fontFamily: captureFonts.headExtra, fontSize: 29, lineHeight: 36, letterSpacing: -0.4, color: ui.ink },
  sheetSub: { marginTop: 4, fontFamily: captureFonts.headSemi, fontSize: 14, lineHeight: 20, color: ui.body },

  google: {
    marginTop: 24,
    height: 54,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#7f1d1d",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  googleBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  googleLabel: { fontFamily: captureFonts.headBold, fontSize: 15.5, letterSpacing: 0.3, color: "#ffffff" },
  pressed: { transform: [{ scale: 0.985 }] },

  error: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.errorBorder,
    backgroundColor: ui.errorBg,
  },
  errorText: { flex: 1, fontFamily: captureFonts.headSemi, fontSize: 13, lineHeight: 19, color: ui.errorText },

  callout: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.calloutBorder,
    backgroundColor: ui.calloutBg,
  },
  calloutText: { flexShrink: 1, fontFamily: captureFonts.headBold, fontSize: 12.5, letterSpacing: -0.2, color: ui.calloutText },

  features: { marginTop: 18, flexDirection: "row", gap: 10 },
  feature: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: "#ffffff",
  },
  featureIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  featureTitle: { fontFamily: captureFonts.headBold, fontSize: 13, lineHeight: 16, color: "#111827" },
  featureHint: { marginTop: 2, fontFamily: captureFonts.headSemi, fontSize: 10, color: ui.muted },

  privacy: { marginTop: 18, alignSelf: "center" },
  privacyText: { fontFamily: captureFonts.headSemi, fontSize: 12.5, color: ui.muted, textDecorationLine: "underline" },
});
