import type { BadgeTone, QueueItem } from "../components/capture";
import type { EventItem } from "../types/app";
import { authorName, reviewStatusOf } from "./eventPresenters";
import { formatRelativeTime } from "./relativeTime";


export function roleTone(role?: string): BadgeTone {
  if (role === "super_admin" || role === "special") return "tertiary";
  if (role === "donor") return "secondary";
  return "primary";
}

export function toQueueItem(event: EventItem): QueueItem {
  const tags: QueueItem["tags"] = [];
  if (event.title) tags.push({ icon: "calendar-blank-outline", label: event.title });
  if (event.costCenterCode) tags.push({ icon: "tag-outline", label: event.costCenterCode });
  const role = event.uploadedByRole;
  return {
    id: event.id,
    authorName: authorName(event),
    authorRole: role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined,
    roleTone: roleTone(role),
    metaLine: `${event.costCenterName || event.cityName || "No location"} • ${formatRelativeTime(event.createdAt)}`,
    caption: event.caption,
    media:
      event.mediaType === "video"
        ? { kind: "video", uri: event.mediaUrl, badge: { icon: "video", label: "Video clip", iconColor: "#FBDA1D" } }
        : { kind: "photo", uri: event.mediaUrl },
    tags,
  };
}

