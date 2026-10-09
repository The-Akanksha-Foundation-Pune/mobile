import { StyleSheet, Text, View } from "react-native";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Tone = "primary" | "secondary" | "tertiary";
type Props = { name: string; size?: number; tone?: Tone };

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toneFor(name: string): Tone {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return (["primary", "secondary", "tertiary"] as const)[hash % 3];
}

/** Circle with the person's initials; color is stable per name unless a tone is given. */
export function AvatarInitials({ name, size = 36, tone }: Props) {
  const { c, type } = useCaptureTheme();
  const resolved = tone ?? toneFor(name);
  const colors = {
    primary: { bg: c.surfaceContainerHigh, fg: c.primary },
    secondary: { bg: c.secondaryFixed, fg: c.secondary },
    tertiary: { bg: c.tertiaryFixed, fg: c.tertiary },
  }[resolved];
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bg }]}>
      <Text style={[type.labelMd, { color: colors.fg, fontFamily: "Inter_700Bold" }]}>{initialsOf(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ circle: { alignItems: "center", justifyContent: "center" } });
