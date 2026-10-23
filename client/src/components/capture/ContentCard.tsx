import type { EventItem } from "../../types/app";
import { authorName, contentKindOf } from "../../utils/eventPresenters";
import { FeedCard } from "./FeedCard";

const DAY = 86_400_000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function timeOf(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function shortDate(date: Date, withYear: boolean) {
  return date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

/** "Today, 3:40 pm" / "Yesterday, 9:05 am" / "Sat 10 Oct" / "12 Mar 2025". */
function friendlyDateTime(iso?: string, now = Date.now()): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const days = Math.round((startOfDay(now) - startOfDay(date.getTime())) / DAY);
  if (days === 0) return `Today, ${timeOf(date)}`;
  if (days === 1) return `Yesterday, ${timeOf(date)}`;
  if (days > 1 && days < 7) return `${date.toLocaleDateString(undefined, { weekday: "long" })}, ${timeOf(date)}`;
  return shortDate(date, date.getFullYear() !== new Date(now).getFullYear());
}

/** Event dates: "Today" / "Tomorrow" / "Sat 10 Oct" and ranges like "10 – 20 Oct". */
function friendlyEventDate(startIso: string, endIso?: string | null, now = Date.now()): string {
  const start = new Date(`${startIso}T00:00:00`);
  if (Number.isNaN(start.getTime())) return startIso;
  const end = endIso && endIso !== startIso ? new Date(`${endIso}T00:00:00`) : null;
  const thisYear = new Date(now).getFullYear();
  if (end && !Number.isNaN(end.getTime())) {
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    const withYear = end.getFullYear() !== thisYear;
    const first = sameMonth ? String(start.getDate()) : start.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const last = end.toLocaleDateString(undefined, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
    return `${first} – ${last}`;
  }
  const days = Math.round((startOfDay(start.getTime()) - startOfDay(now)) / DAY);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return shortDate(start, start.getFullYear() !== thisYear);
}

type Props = {
  item: EventItem;
  onPress?: () => void;
};

/** Maps a feed item onto the one stable FeedCard layout. */
export function ContentCard({ item, onPress }: Props) {
  const kind = contentKindOf(item);
  const isEvent = kind === "event";
  // Events: "Main Hall, Hadapsar Centre, Pune". Posts and stories: "Hadapsar Centre, Pune".
  const place = isEvent ? item.location || "" : "";
  const costCenter = item.costCenterName || item.costCenterCode || "";
  const city = item.cityName || "";
  const locationLabel = [...new Set([place, costCenter, city].filter(Boolean))].join(", ");

  return (
    <FeedCard
      kind={kind}
      title={item.title || (isEvent ? "Untitled event" : item.caption || (kind === "story" ? "Untitled story" : "Untitled post"))}
      dateLabel={isEvent ? friendlyEventDate(item.eventDate, item.endDate) : friendlyDateTime(item.createdAt)}
      imageUri={item.mediaUrl || undefined}
      isVideo={item.mediaType === "video"}
      authorName={isEvent ? undefined : authorName(item)}
      eventName={isEvent ? undefined : item.parentTitle || undefined}
      locationLabel={locationLabel || undefined}
      onPress={onPress}
    />
  );
}
