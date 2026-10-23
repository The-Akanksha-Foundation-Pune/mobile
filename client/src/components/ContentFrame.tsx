import { ReactNode } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { captureLayout } from "../theme/capture";

type ContentFrameProps = {
  /** Fill the remaining height (screen bodies) instead of sizing to content (headers, bars). */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** Centers content in a column no wider than contentMaxWidth, so tablets don't stretch phone layouts edge to edge. */
export function ContentFrame({ fill = false, style, children }: ContentFrameProps) {
  return (
    <View style={[{ width: "100%", maxWidth: captureLayout.contentMaxWidth, alignSelf: "center" }, fill && { flex: 1 }, style]}>
      {children}
    </View>
  );
}
