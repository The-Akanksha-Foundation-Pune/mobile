import { useEffect, useState } from "react";
import { Popup, type PopupAction, type PopupTone } from "./Popup";

type AlertButton = { text: string; onPress?: () => void; style?: "default" | "cancel" | "destructive" };

export type PopupRequest = {
  title: string;
  message?: string;
  tone?: PopupTone;
  actions?: PopupAction[];
  dismissible?: boolean;
};

type Listener = (request: PopupRequest | null) => void;
let listener: Listener | null = null;
let queue: PopupRequest[] = [];

function emit() {
  listener?.(queue[0] ?? null);
}

/** Opens the app popup from anywhere, like Alert.alert. Requests queue if one is already open. */
export function showPopup(request: PopupRequest) {
  queue = [...queue, request];
  if (queue.length === 1) emit();
}

function guessTone(title: string): PopupTone {
  const t = title.toLowerCase();
  if (/(error|fail|cannot|can't|unable|denied|invalid|missing)/.test(t)) return "danger";
  if (/(success|saved|done|published|added|approved)/.test(t)) return "success";
  if (/(permission|needed|required|cancel|wait|limit)/.test(t)) return "warning";
  return "info";
}

/** Drop-in replacement for Alert.alert(title, message, buttons) that renders the branded popup. */
export function popupAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const actions: PopupAction[] | undefined = buttons?.map((b) => ({
    label: b.text,
    onPress: b.onPress,
    variant: b.style === "destructive" ? "danger" : b.style === "cancel" ? "secondary" : undefined,
  }));
  const tone = actions?.some((a) => a.variant === "danger") ? "danger" : guessTone(title);
  showPopup({ title, message, tone, actions, dismissible: !buttons || buttons.length < 2 });
}

/** Mount once at the app root; renders whatever showPopup / popupAlert asked for. */
export function PopupHost() {
  const [current, setCurrent] = useState<PopupRequest | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    listener = (request) => {
      setCurrent((previous) => request ?? previous);
      setVisible(Boolean(request));
    };
    emit();
    return () => {
      listener = null;
    };
  }, []);

  function close() {
    setVisible(false);
    // Let the exit animation play before showing the next queued popup.
    setTimeout(() => {
      queue = queue.slice(1);
      emit();
    }, 180);
  }

  if (!current) return null;
  return (
    <Popup
      visible={visible}
      title={current.title}
      message={current.message}
      tone={current.tone}
      actions={current.actions}
      dismissible={current.dismissible}
      onClose={close}
    />
  );
}
