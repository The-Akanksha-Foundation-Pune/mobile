import type { EventItem } from "../../types/app";
import {
  authorName,
  contentKindOf,
  eventStatusPresentation,
  formatEventDate,
  placeOf,
  reviewStatusOf,
  reviewStatusPresentation,
} from "../../utils/eventPresenters";
import { formatRelativeTime } from "../../utils/relativeTime";
import { EventCard } from "./EventCard";
import { PostCard } from "./PostCard";
import { StoryCard } from "./StoryCard";

function roleLabel(role?: string) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined;
}

type Props = {
  item: EventItem;
  onPress?: () => void;
};

/** Picks the event, story or post card for a content item. */
export function ContentCard({ item, onPress }: Props) {
  const kind = contentKindOf(item);
  if (kind === "event") {
    const status = eventStatusPresentation(item.eventStatus);
    return (
      <EventCard
        title={item.title || "Untitled event"}
        description={item.caption}
        dateLabel={formatEventDate(item.eventDate)}
        locationLabel={placeOf(item) || undefined}
        imageUri={item.eventStatus === "upcoming" ? undefined : item.mediaUrl}
        postCount={item.postCount ?? 0}
        storyCount={item.storyCount ?? 0}
        statusLabel={status.label}
        statusTone={status.tone}
        onPress={onPress}
      />
    );
  }
  if (kind === "story") {
    return (
      <StoryCard
        title={item.title || "Untitled story"}
        excerpt={item.caption}
        imageUri={item.mediaUrl}
        authorName={authorName(item)}
        authorRole={roleLabel(item.uploadedByRole)}
        onPress={onPress}
      />
    );
  }
  return (
    <PostCard
      authorName={authorName(item)}
      authorMeta={`${placeOf(item) || "No location"} • ${formatRelativeTime(item.createdAt)}`}
      typeLabel="Post"
      caption={item.caption}
      media={{ kind: item.mediaType, uri: item.mediaUrl }}
      linkedLabel={item.parentTitle || undefined}
      status={reviewStatusPresentation(reviewStatusOf(item))}
      onPress={onPress}
    />
  );
}
