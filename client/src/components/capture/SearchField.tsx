import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  /** "sm" is the compact tinted field; "md" is the 48px field. */
  size?: "sm" | "md";
  /** White with a soft shadow instead of the tinted background. */
  elevated?: boolean;
  /** Short hints typed out one after another in the empty field; overrides `placeholder`. */
  placeholders?: string[];
};

const TYPE_MS = 55;
const ERASE_MS = 25;
const HOLD_MS = 1400;

/** Cycles through hints with a typewriter effect; shows them whole when reduce-motion is on. */
function useTypingPlaceholder(hints: string[] | undefined, active: boolean) {
  const [text, setText] = useState(hints?.[0] ?? "");
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hints || hints.length === 0 || !active) return;
    let index = 0;
    let length = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;

    if (reduceMotion) {
      setText(hints[0]);
      const interval = setInterval(() => {
        index = (index + 1) % hints.length;
        setText(hints[index]);
      }, HOLD_MS * 2);
      return () => clearInterval(interval);
    }

    const tick = () => {
      const hint = hints[index];
      if (!erasing) {
        length += 1;
        setText(hint.slice(0, length));
        if (length >= hint.length) {
          erasing = true;
          timer = setTimeout(tick, HOLD_MS);
          return;
        }
        timer = setTimeout(tick, TYPE_MS);
      } else {
        length -= 1;
        setText(hint.slice(0, length));
        if (length <= 0) {
          erasing = false;
          index = (index + 1) % hints.length;
        }
        timer = setTimeout(tick, ERASE_MS);
      }
    };
    setText("");
    timer = setTimeout(tick, TYPE_MS);
    return () => clearTimeout(timer);
  }, [hints?.join("|"), active, reduceMotion]);

  return text;
}

/** Search input with a leading icon and a clear button once there is text. */
export function SearchField({ value, onChangeText, placeholder = "Search...", size = "sm", elevated = false, placeholders }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const typed = useTypingPlaceholder(placeholders, !value);
  return (
    <View
      style={[
        styles.wrap,
        elevated && shadow.level1,
        {
          minHeight: size === "md" ? layout.control.inputHeight : 40,
          backgroundColor: elevated ? c.surfaceCard : c.surfaceContainerLow,
          borderRadius: layout.radius.md,
          paddingLeft: size === "md" ? 14 : 12,
        },
      ]}
    >
      <MaterialCommunityIcons name="magnify" size={20} color={c.onSurfaceVariant} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholders?.length ? typed : placeholder}
        accessibilityLabel={placeholders?.length ? "Search" : placeholder}
        placeholderTextColor={c.onSurfaceVariant}
        style={[styles.input, size === "md" ? type.bodyMd : type.bodySm, { color: c.onSurface }]}
        returnKeyType="search"
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} style={styles.clear} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={6}>
          <MaterialCommunityIcons name="close" size={18} color={c.onSurfaceVariant} />
        </Pressable>
      ) : (
        <View style={styles.clear} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingRight: 6 },
  input: { flex: 1, paddingVertical: 10 },
  clear: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
