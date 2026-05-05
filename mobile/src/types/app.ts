import type { ImagePickerAsset } from "expo-image-picker";

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type EventType = {
  id: string;
  name: string;
};

export type EventItem = {
  id: string;
  title: string;
  caption: string;
  typeId: string;
  eventDate: string;
  mediaType: "photo" | "video";
  mediaUrl: string;
  originalName: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  createdAt: string;
  eventTypeName: string;
};

export type AppRoute = "home" | "notFound";

export type MediaMode = "photo" | "video";

export type SelectedMedia = ImagePickerAsset | null;
