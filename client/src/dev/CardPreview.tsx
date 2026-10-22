import { ScrollView, StyleSheet, View } from "react-native";
import { CaptureButton, HeroMedia, OfflineState, popupAlert, showPopup } from "../components/capture";
import { Text } from "react-native";
import { ContentCard } from "../components/capture";
import type { EventItem } from "../types/app";
import { captureLight } from "../theme/capture";

/** Dev-only: open http://localhost:8081/?preview=cards to view feed cards with sample data. */
const base = "http://localhost:4000/media";
const now = new Date();
const iso = (d: Date) => d.toISOString();
const day = (offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const common = { cityId: "c1", cityName: "Pune", costCenterId: "cc1", costCenterCode: "HAD", costCenterName: "Hadapsar Centre", uploadedBy: "u1", uploadedById: "u1", reviewStatus: "approved", approvedForGallery: true } as unknown as Partial<EventItem>;

export const SAMPLE_ITEMS: EventItem[] = [
  { ...common, id: "1", kind: "event", location: "Main Hall", title: "Annual Science Fair 2026 — Hadapsar Centre", caption: "Students present projects", eventDate: day(-2), endDate: day(6), eventStatus: "live", mediaType: "photo", mediaUrl: `${base}/1791798091939-29ea43f8cae4e25235802595.jpg`, createdAt: iso(now), postCount: 8, storyCount: 2 } as unknown as EventItem,
  { ...common, id: "2", kind: "post", title: "", caption: "Volunteers setting up the robotics table before the doors opened", eventDate: day(0), eventStatus: "live", mediaType: "photo", mediaUrl: `${base}/1791798090455-774706687a69083c099bc783.jpg`, createdAt: iso(new Date(now.getTime() - 2 * 3600e3)), uploadedByName: "Priya Sharma", uploadedByRole: "user", parentTitle: "Annual Science Fair 2026 — Hadapsar Centre" } as unknown as EventItem,
  { ...common, id: "3", kind: "story", title: "How Aarav built his first circuit", caption: "A story", eventDate: day(0), eventStatus: "live", mediaType: "photo", mediaUrl: `${base}/1791798088851-d4defd3c91d8b83fbd79be69.jpg`, createdAt: iso(new Date(now.getTime() - 26 * 3600e3)), uploadedByName: "Rahul Deshmukh", uploadedByRole: "donor", parentTitle: "Annual Science Fair 2026 — Hadapsar Centre" } as unknown as EventItem,
  { ...common, id: "4", kind: "event", location: "Wadgaon Sheri Community Hall", title: "Health Camp Wrap-up", caption: "", eventDate: day(3), eventStatus: "upcoming", mediaType: "photo", mediaUrl: "", createdAt: iso(now), postCount: 0, storyCount: 0 } as unknown as EventItem,
  { ...common, id: "5", kind: "post", title: "", caption: "Kit distribution day", eventDate: day(-20), eventStatus: "ended", mediaType: "video", mediaUrl: `${base}/1791790404809-22a42e0b8ebd360f14ec1093.jpg`, createdAt: iso(new Date(now.getTime() - 20 * 86400e3)), uploadedByName: "Seed Volunteer", uploadedByRole: "user", parentTitle: "School Kit Distribution" } as unknown as EventItem,
];

export function CardPreview() {
  return (
    <ScrollView style={{ backgroundColor: captureLight.surface }} contentContainerStyle={styles.content}>
      <View style={styles.phone}>
        <View style={styles.buttons}>
          <CaptureButton label="Info popup" size="sm" onPress={() => popupAlert("Post added for review", "A coordinator will approve it before it shows in the feed.")} />
          <CaptureButton label="Confirm" size="sm" variant="secondary" onPress={() => popupAlert("Remove this post?", "This cannot be undone.", [{ text: "Keep", style: "cancel" }, { text: "Remove", style: "destructive" }])} />
          <CaptureButton label="Error" size="sm" variant="danger" onPress={() => popupAlert("Upload error", "Cannot reach the backend. Check your connection and try again.")} />
          <CaptureButton label="Success" size="sm" variant="success" onPress={() => showPopup({ title: "Story published", message: "Your story is now live on the event page.", tone: "success", actions: [{ label: "View event" }] })} />
        </View>
        <HeroMedia uri={`${base}/1791798090455-774706687a69083c099bc783.jpg`} height={260} badge={{ icon: "book-open-page-variant", label: "Deep Story" }}>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "800" }}>A huge title</Text>
        </HeroMedia>
        <OfflineState />
        <OfflineState variant="slow" />
        {SAMPLE_ITEMS.map((item) => (
          <ContentCard key={item.id} item={item} onPress={() => {}} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: "center", padding: 16 },
  phone: { width: 360, gap: 12 },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
