import type { StatusTone } from "../theme/capture";
import type { ContentKind, EventItem, EventStatus, ReviewStatus } from "../types/app";

/** Review state, falling back to the older approved flag for records without one. */
export function reviewStatusOf(event: EventItem): ReviewStatus {
  return event.reviewStatus ?? (event.approvedForGallery ? "approved" : "pending");
}

export function authorName(event: EventItem): string {
  return event.uploadedByName || event.uploadedByEmail?.split("@")[0] || "Unknown";
}

export function reviewStatusPresentation(status: ReviewStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case "approved":
      return { label: "Approved", tone: "success" };
    case "changes_requested":
      return { label: "Changes needed", tone: "danger" };
    default:
      return { label: "Pending review", tone: "warning" };
  }
}

export function contentKindOf(event: EventItem): ContentKind {
  return event.kind ?? "event";
}

/** "June 2, 2026" from the API's YYYY-MM-DD date. */
export function formatEventDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export function eventStatusPresentation(status: EventStatus): { label: string; tone: StatusTone } {
  switch (status) {
    case "ongoing":
      return { label: "Ongoing", tone: "info" };
    case "complete":
      return { label: "Completed", tone: "success" };
    default:
      return { label: "Upcoming", tone: "warning" };
  }
}

/** Where a record happened, for meta lines. */
export function placeOf(event: EventItem): string {
  return event.location || event.costCenterName || event.cityName || "";
}
