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

/** Start of the event's first day, which is when it goes live. */
function liveSince(event: EventItem): string {
  return new Date(`${event.eventDate}T00:00:00`).toISOString();
}

/**
 * Who gets what:
 * - Everyone: an event went live; someone posted a post or story on a live event.
 * - Donor team ("DR") and special users: someone created an event.
 * - Super admins: someone created an event; a donor-team member approved a post or story.
 */
function buildNotifications(events: EventItem[], user: User): Omit<AppNotification, "unread">[] {
  const since = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recent = (iso?: string | null) => Boolean(iso) && new Date(iso as string).getTime() >= since;
  const byId = new Map(events.map((event) => [event.id, event]));
  const role = user.role;
  const isAdmin = role === "super_admin";
  const seesNewEvents = isAdmin || role === "donor" || role === "special";
  const items: Omit<AppNotification, "unread">[] = [];

  for (const event of events) {
    const kind = contentKindOf(event);
    const mine = event.uploadedBy === user.id;

    if (kind === "event") {
      // Everyone: the event is live now.
      if (event.eventStatus === "ongoing" && recent(liveSince(event))) {
        items.push({
          id: `live:${event.id}:${event.eventDate}`,
          icon: "calendar-check",
          tone: "success",
          title: "Event is live",
          message: `"${titleOf(event)}" is on now. Share your posts and stories.`,
          at: liveSince(event),
          target: { type: "content", kind: "event", id: event.id },
        });
      }
      // Donor team, special users and admins: someone created an event.
      if (seesNewEvents && !mine && recent(event.createdAt)) {
        items.push({
          id: `new-event:${event.id}`,
          icon: "calendar-star",
          tone: "warning",
          title: "New event created",
          message: `${authorName(event)} created "${titleOf(event)}"${event.cityName ? ` in ${event.cityName}` : ""}`,
          at: event.createdAt,
          target: { type: "content", kind: "event", id: event.id },
        });
      }
      continue;
    }

    const parent = event.parentEventId ? byId.get(event.parentEventId) : undefined;

    // Everyone: someone posted on a live event.
    if (!mine && parent && parent.eventStatus === "ongoing" && recent(event.createdAt)) {
      items.push({
        id: `contribution:${event.id}`,
        icon: kind === "story" ? "book-open-page-variant" : "image-multiple",
        tone: "info",
        title: `New ${KIND_LABEL[kind]} on a live event`,
        message: `${authorName(event)} posted on "${titleOf(parent)}"`,
        at: event.createdAt,
        target: { type: "content", kind, id: event.id },
      });
    }

    // Admins: a donor-team member approved a post or story.
    if (
      isAdmin &&
      reviewStatusOf(event) === "approved" &&
      event.reviewedByRole === "donor" &&
      event.reviewedById !== user.id &&
      recent(event.reviewedAt)
    ) {
      items.push({
        id: `approved:${event.id}:${event.reviewedAt}`,
        icon: "check-decagram",
        tone: "success",
        title: `${KIND_LABEL[kind] === "story" ? "Story" : "Post"} approved by ${event.reviewedByName || "the donor team"}`,
        message: `"${titleOf(event)}" by ${authorName(event)}`,
        at: event.reviewedAt as string,
        target: { type: "content", kind, id: event.id },
      });
    }
  }

  return items.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

/** Notifications for the signed-in user, with read state remembered on this device. */
export function useNotifications(events: EventItem[], user: User) {
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
    // Nothing that happened before the account existed counts as unread.
    const joinedAt = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    const unreadSince = Math.max(readState.allReadAt, Number.isFinite(joinedAt) ? joinedAt : 0);
    return buildNotifications(events, user).map((item) => ({
      ...item,
      unread: new Date(item.at).getTime() > unreadSince && !read.has(item.id),
    }));
  }, [events, user, readState]);

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
