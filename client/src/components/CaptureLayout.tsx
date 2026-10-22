import { ComponentProps, ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaptureHeader } from "./CaptureHeader";
import { ContentFrame } from "./ContentFrame";
import { CaptureTabBar, CaptureTab } from "./CaptureTabBar";
import { captureLight } from "../theme/capture";

type CaptureLayoutProps = {
  /** Header settings. Pass null when the screen draws its own header. */
  header?: ComponentProps<typeof CaptureHeader> | null;
  /** Bottom bar settings. Leave out to hide the bar. */
  tabs?: {
    items: CaptureTab[];
    activeId: string;
    onSelect: (id: string) => void;
  };
  children: ReactNode;
};

/** Page shell: header on top, screen content in the middle, tab bar at the bottom. */
export function CaptureLayout({ header = null, tabs, children }: CaptureLayoutProps) {
  const c = captureLight;

  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      {header ? (
        <SafeAreaView edges={["top"]} style={{ backgroundColor: c.surface }}>
          <ContentFrame>
            <CaptureHeader {...header} />
          </ContentFrame>
        </SafeAreaView>
      ) : null}
      <ContentFrame fill>{children}</ContentFrame>
      {tabs ? <CaptureTabBar tabs={tabs.items} activeId={tabs.activeId} onSelect={tabs.onSelect} /> : null}
    </View>
  );
}
