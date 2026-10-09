import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { CaptureButton } from "./CaptureButton";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type ReviewReason = { id: string; label: string; description?: string };

export type RejectSubmission = { reasonId: string; reasonLabel: string; note: string };

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  intro?: string;
  reasons: ReviewReason[];
  noteLabel?: string;
  notePlaceholder?: string;
  submitLabel?: string;
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (submission: RejectSubmission) => void;
};

/** "Request changes" drawer: pick a reason, add an optional note, send. */
export function RejectReasonSheet({
  visible,
  title = "Request Changes",
  subtitle,
  intro = "Select a reason so the contributor receives clear guidance to re-submit:",
  reasons,
  noteLabel = "Note to contributor (optional)",
  notePlaceholder = "e.g. Please re-upload the higher-res group photo...",
  submitLabel = "Send Notice",
  submitting,
  onCancel,
  onSubmit,
}: Props) {
  const { c, type, layout } = useCaptureTheme();
  const [reasonId, setReasonId] = useState(reasons[0]?.id ?? "");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setReasonId(reasons[0]?.id ?? "");
      setNote("");
    }
  }, [visible, reasons]);

  const selected = reasons.find((reason) => reason.id === reasonId);

  return (
    <BottomSheet visible={visible} onClose={onCancel} title={title} subtitle={subtitle}>
      <Text style={[type.bodyMd, { color: c.onSurfaceVariant, marginBottom: 16 }]}>{intro}</Text>
      <View style={styles.list}>
        {reasons.map((reason) => {
          const active = reason.id === reasonId;
          return (
            <Pressable
              key={reason.id}
              onPress={() => setReasonId(reason.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: pressed || active ? c.surfaceContainer : c.surfaceContainerLow, borderRadius: layout.radius.md },
              ]}
            >
              <View style={[styles.radio, { borderColor: active ? c.primary : c.outline }]}>
                {active ? <View style={[styles.radioDot, { backgroundColor: c.primary }]} /> : null}
              </View>
              <View style={styles.optionText}>
                <Text style={[type.labelMd, { color: c.onSurface }]}>{reason.label}</Text>
                {reason.description ? <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{reason.description}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[type.labelMd, { color: c.onSurface, marginTop: 20, marginBottom: 6 }]}>{noteLabel}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={notePlaceholder}
        placeholderTextColor={c.onSurfaceVariant}
        multiline
        textAlignVertical="top"
        style={[styles.note, type.bodySm, { color: c.onSurface, backgroundColor: c.surfaceContainerLow, borderRadius: layout.radius.md }]}
      />

      <View style={styles.footer}>
        <CaptureButton label="Cancel" variant="tonal" onPress={onCancel} disabled={submitting} style={styles.footerBtn} />
        <CaptureButton
          label={submitLabel}
          variant="danger"
          loading={submitting}
          disabled={!selected}
          onPress={() => selected && onSubmit({ reasonId: selected.id, reasonLabel: selected.label, note: note.trim() })}
          style={styles.footerBtn}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { flex: 1, gap: 1 },
  note: { minHeight: 64, padding: 12 },
  footer: { flexDirection: "row", gap: 12, marginTop: 20 },
  footerBtn: { flex: 1 },
});
