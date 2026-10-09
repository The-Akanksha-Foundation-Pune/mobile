import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MaterialCommunityIcons } from "@expo/vector-icons";
import type { StatusTone } from "../theme/capture";
import type { ContentKind, EventItem, User } from "../types/app";
import { authorName, contentKindOf, reviewStatusOf } from "../utils/eventPresenters";

const WINDOW_DAYS = 30;
const MAX_READ_IDS = 300;
const storageKey = (userId: string) => `captureakanksha.notifications.${userId}`;

export type NotificationTarget =
  | { type: "content"; kind: ContentKind; id: string }
  | { type: "reviewQueue" };

export type AppNotification = {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  tone: StatusTone;
  title: string;
  message: string;
  /** ISO time the thing happened; drives ordering and unread state. */
  at: string;
  target: NotificationTarget;
  unread: boolean;
};

type ReadState = { allReadAt: number; readIds: string[] };

const KIND_LABEL: Record<ContentKind, string> = { event: "event", post: "post", story: "story" };

function titleOf(event: EventItem): string {
  return event.title || event.caption || `Untitled ${KIND_LABEL[contentKindOf(event)]}`;
}

/** Builds the feed from data the app already has: review outcomes, contributions and new events nearby. */
function buildNotifications(events: EventItem[], user: User, isAdmin: boolean): Omit<AppNotification, "unread">[] {
  const since = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = (iso?: string | null) => Boolean(iso) && new Date(iso as string).getTime() >= since;
  const byId = new Map(events.map((event) => [event.id, event]));
  const items: Omit<AppNotification, "unread">[] = [];

  for (const event of events) {
    const kind = contentKindOf(event);
    const mine = event.uploadedBy === user.id;

    // A reviewer made a decision on something I uploaded.
    const status = reviewStatusOf(event);
    if (mine && event.reviewedAt && recent(event.reviewedAt) && status !== "pending") {
      const approved = status === "approved";
      const detail = [event.reviewReason, event.reviewNote].filter(Boolean).join(" — ");
      items.push({
        id: `review:${event.id}:${event.reviewedAt}`,
        icon: approved ? "check-decagram" : "alert-circle-outline",
        tone: approved ? "success" : "danger",
        title: approved ? `Your ${KIND_LABEL[kind]} was approved` : `Changes requested on your ${KIND_LABEL[kind]}`,
        message: approved ? titleOf(event) : detail ? `${titleOf(event)}: ${detail}` : titleOf(event),
        at: event.reviewedAt,
        target: { type: "content", kind, id: event.id },
      });
    }

    if (mine || !recent(event.createdAt)) continue;

    // Someone added a post or story under an event I created.
    const parent = event.parentEventId ? byId.get(event.parentEventId) : undefined;
    if (kind !== "event" && parent && parent.uploadedBy === user.id) {
      items.push({
        id: `contribution:${event.id}`,
        icon: kind === "story" ? "book-open-page-variant" : "image-multiple",
        tone: "info",
        title: `${authorName(event)} added a ${KIND_LABEL[kind]}`,
        message: `On your event "${titleOf(parent)}"`,
        at: event.createdAt,
        target: { type: "content", kind, id: event.id },
      });
      continue;
    }

    // A new event was created in my city.
    if (kind === "event" && user.cityId && event.cityId === user.cityId) {
      items.push({
        id: `new-event:${event.id}`,
        icon: "calendar-star",
        tone: "warning",
        title: `New event in ${event.cityName || user.cityName || "your city"}`,
        message: `${authorName(event)} created "${titleOf(event)}"`,
        at: event.createdAt,
        target: { type: "content", kind: "event", id: event.id },
      });
    }
  }

  // Admins get one summary item for the review queue rather than one per submission.
  if (isAdmin) {
    const pending = events.filter((event) => reviewStatusOf(event) === "pending");
    if (pending.length > 0) {
      const latest = pending.reduce((a, b) => ((a.createdAt || "") > (b.createdAt || "") ? a : b));
      items.push({
        id: `review-queue:${pending.length}:${latest.id}`,
        icon: "clipboard-text-clock-outline",
        tone: "neutral",
        title: `${pending.length} submission${pending.length === 1 ? "" : "s"} waiting for review`,
        message: `Latest: "${titleOf(latest)}" by ${authorName(latest)}`,
        at: latest.createdAt,
        target: { type: "reviewQueue" },
      });
    }
  }

  return items.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

/** Notifications for the signed-in user, with read state remembered on this device. */
export function useNotifications(events: EventItem[], user: User) {
  const isAdmin = user.role === "admin";
  const [readState, setReadState] = useState<ReadState>({ allReadAt: 0, readIds: [] });

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(storageKey(user.id))
      .then((raw) => {
        if (!cancelled && raw) setReadState({ allReadAt: 0, readIds: [], ...JSON.parse(raw) });
      })
      .catch(() => {
        // Missing or unreadable state just means everything shows as unread.
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const persist = useCallback(
    (next: ReadState) => {
      setReadState(next);
      void AsyncStorage.setItem(storageKey(user.id), JSON.stringify(next)).catch(() => {
        // Ignore storage write issues.
      });
    },
    [user.id]
  );

  const notifications = useMemo<AppNotification[]>(() => {
    const read = new Set(readState.readIds);
    return buildNotifications(events, user, isAdmin).map((item) => ({
      ...item,
      unread: new Date(item.at).getTime() > readState.allReadAt && !read.has(item.id),
    }));
  }, [events, user, isAdmin, readState]);

  const unreadCount = notifications.filter((item) => item.unread).length;

  const markRead = useCallback(
    (id: string) => {
      if (readState.readIds.includes(id)) return;
      persist({ ...readState, readIds: [id, ...readState.readIds].slice(0, MAX_READ_IDS) });
    },
    [readState, persist]
  );

  const markAllRead = useCallback(() => persist({ allReadAt: Date.now(), readIds: [] }), [persist]);

  return { notifications, unreadCount, markRead, markAllRead };
}
