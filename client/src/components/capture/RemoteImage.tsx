import { ComponentProps, useEffect, useState } from "react";
import { Image, ImageStyle, StyleProp, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

type Props = {
  uri?: string | null;
  /** Defaults to filling the parent, which is how cards lay out their media. */
  style?: StyleProp<ImageStyle>;
  resizeMode?: ComponentProps<typeof Image>["resizeMode"];
  /** Shown when there is no image or it fails to load; null shows only the background. */
  fallbackIcon?: IconName | null;
  fallbackIconSize?: number;
};

/**
 * Remote image with one fallback for both "no image" and "image failed to load" (an expired
 * or private Drive link, a deleted file, no network), so a broken link looks like a missing one.
 */
export function RemoteImage({
  uri,
  style = StyleSheet.absoluteFill,
  resizeMode = "cover",
  fallbackIcon = "image-outline",
  fallbackIconSize = 28,
}: Props) {
  const { c } = useCaptureTheme();
  const [failed, setFailed] = useState(false);

  // A new uri gets a fresh attempt (e.g. after a re-upload or a list refresh).
  useEffect(() => setFailed(false), [uri]);

  if (uri && !failed) {
    return <Image resizeMethod="resize" source={{ uri }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />;
  }
  return (
    <View style={[style as StyleProp<ImageStyle>, styles.fallback]}>
      {fallbackIcon ? <MaterialCommunityIcons name={fallbackIcon} size={fallbackIconSize} color={c.onSurfaceVariant} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: "center", justifyContent: "center" },
});
